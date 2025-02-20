const http = require('node:http');
const url = require('url');
const log = require('../util/log');


/*
    The start function will be called to start your node.
    It will take a callback as an argument.
    After your node has booted, you should call the callback.
*/


const start = function(callback) {
    console.log('[local/node] Starting node server...');
    
    // Initialize global objects if they don't exist
    if (!global.toLocal) {
        console.log('[local/node] Initializing global.toLocal object');
        global.toLocal = {}; // Initialize as plain object instead of Map
    }

    // Add safety check for callback
    console.log("callback_in_node is: ", callback);
    if (typeof callback !== 'function') {
        console.warn('[local/node] Invalid callback provided to node.start, using default');
        callback = function() { };
    }

    // first initialize RPC service  
    if (!global.distribution.local.rpc) {
        console.log('[local/node] Initializing RPC service...');
        global.distribution.local.rpc = {
            call: function(args, callback) {
                console.log('[local/node] RPC call received:', args);
                const funcId = args.pop();
                const func = global.toLocal.get(funcId);
                if (!func) {
                    console.error('[local/node] RPC function not found:', funcId);
                    callback(new Error('RPC function not found'));
                    return;
                }
                try {
                    func(...args, callback);
                } catch (e) {
                    console.error('[local/node] RPC call error:', e);
                    callback(e);
                }
            }
        };
        
        // add RPC in routes
        console.log('[local/node] Registering RPC service in routes...');
        global.distribution.local.routes.put(global.distribution.local.rpc, 'rpc', (err) => {
            if (err) console.error('Failed to register RPC service:', err);
        });
    }

    console.log('[local/node] Creating HTTP server...');
    const server = http.createServer((req, res) => {
        console.log('[local/node] Received request:', req.method, req.url);
        if (req.method !== 'PUT') {
            res.end(JSON.stringify({ error: 'Method not allowed', value: null }));
            return;
        }

        /*
          The path of the http request will determine the service to be used.
          The url will have the form: http://node_ip:node_port/service/method
        */
        const processedUrl = url.parse(req.url, true);
        const pathParts = processedUrl.pathname.split('/').filter(Boolean);

        if (pathParts.length !== 3) {
            res.end(JSON.stringify({ error: 'Invalid URL format.', value: null }));
            return;
        }

        const [gid, service, method] = pathParts;
      

        /*
          A common pattern in handling HTTP requests in Node.js is to have a
          subroutine that collects all the data chunks belonging to the same
          request. These chunks are aggregated into a body variable.

          When the req.on('end') event is emitted, it signifies that all data from
          the request has been received. Typically, this data is in the form of a
          string. To work with this data in a structured format, it is often parsed
          into a JSON object using JSON.parse(body), provided the data is in JSON
          format.

          Our nodes expect data in JSON format.
        */
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const args = JSON.parse(body);

                if (service === 'status' && method === 'stop') {
                    server.close(() => {
                        res.end(JSON.stringify({ error: null, value: true }));
                    });
                    return;
                }

                if (service === 'rpc') {
                    global.distribution.local.rpc.call(args, (err, result) => {
                        if (err) {
                            res.end(JSON.stringify({ error: err.message, value: null }));
                        } else {
                            res.end(JSON.stringify({ error: null, value: result }));
                        }
                    });
                    return;
                }

                global.distribution.local.routes.get(service, (e, v) => {
                    if (e) {
                        res.end(JSON.stringify({ error: 'Service not found', value: null }));
                        return;
                    }
                    
                    if (!v[method]) {
                        res.end(JSON.stringify({ error: 'Method not found', value: null }));
                        return;
                    }

                    v[method](...args, (errors, values) => {
                        // Special handling for distributed service responses
                        if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
                            // For distributed services, send both errors and values
                            res.end(JSON.stringify({
                                error: errors,
                                value: values || {}
                            }));
                        } else if (errors instanceof Error) {
                            // For local services with Error objects
                            res.end(JSON.stringify({
                                error: errors.message,
                                value: null
                            }));
                        } else if (errors) {
                            // For other error types
                            res.end(JSON.stringify({
                                error: errors.toString(),
                                value: null
                            }));
                        } else {
                            // Success case
                            res.end(JSON.stringify({
                                error: null,
                                value: values
                            }));
                        }
                    });
                });
            } catch (e) {
                res.end(JSON.stringify({ error: e.message, value: null }));
            }
        });
    });


    /*
      Your server will be listening on the port and ip specified in the config
      You'll be calling the `callback` callback when your server has successfully
      started.

      At some point, we'll be adding the ability to stop a node
      remotely through the service interface.
    */


    console.log('[local/node] Starting server on', global.nodeConfig.ip, global.nodeConfig.port);
    server.listen(global.nodeConfig.port, global.nodeConfig.ip, () => {
        log(`Server running at http://${global.nodeConfig.ip}:${global.nodeConfig.port}/`);
        global.distribution.node.server = server;
        console.log('[local/node] Server started successfully, calling callback');
        callback(server);
    });

    server.on('error', (error) => {
        console.error('[local/node] Server error:', error);
        throw error;
    });
};



module.exports = {
  start: start,
};