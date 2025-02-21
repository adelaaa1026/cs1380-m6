const http = require('node:http');
/** @typedef {import("../types").Callback} Callback */
/** @typedef {import("../types").Node} Node */

/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 * @property {Node} node
 */

/**
 * @param {Array} message
 * @param {Target} remote
 * @param {Callback} [callback]
 * @return {void}
 */
function send(message, remote, callback) {
    // console.log('[local/comm] Sending request:', { 
    //     message, 
    //     remote: {
    //         ...remote,
    //         node: {
    //             ip: remote.node?.ip,
    //             port: remote.node?.port
    //         }
    //     }
    // });

    callback = callback || function() { };

    if (!remote || !remote.node || !remote.service || !remote.method) {
        console.error('[local/comm] Invalid remote configuration');
        callback(new Error('The remote node is invalid'), null);
        return;
    }

    const options = {
        hostname: remote.node.ip,
        port: remote.node.port,
        path: `/${remote.gid || 'local'}/${remote.service}/${remote.method}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 1000
    };

    // console.log('[local/comm] Making request with options:', options);

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });
         
        res.on('end', () => {
            console.log('[local/comm] Raw response data length:', data.length);
            console.log('[local/comm] Raw response data:', data);

            try {
                const result = JSON.parse(data);
                console.log('[local/comm] Parsed result:', result);
                
                // Convert error object to Error instance if it exists
                //working
                // let error = {};
                // if (result.error && Object.keys(result.error).length > 0) {
                //     if (typeof result.error === 'object' ) {
                //         console.log('[local/comm] Error is an object:', result.error);
                //         error = new Error(result.error.message);
                //         error.name = result.error.name;
                //         error.stack = result.error.stack;
                //     } else {
                        
                //         error = new Error(result.error);
                //     }
                // }
                let error = {};
                if (result.error) {
                    if (typeof result.error === 'object' && Object.keys(result.error).length > 0) {
                        // Error is a non-empty object
                        console.log('[local/comm] Error is an object:', result.error);
                        error = new Error(result.error.message);
                        error.name = result.error.name;
                        error.stack = result.error.stack;
                    } else if (typeof result.error === 'string') {
                        // Error is a string message
                        console.log('[local/comm] Error is a string:', result.error);
                        error = new Error(result.error);
                    }
                }
                
                callback(error, result.value);
            } catch (error) {
                console.error('[local/comm] Error parsing data:', data);
                console.error('[local/comm] Parsing error:', error);
                callback(new Error('Failed to parse response'), null);
            }
        });
    });

    req.on('error', (error) => {
        req.destroy();
        callback(error instanceof Error ? error : new Error(error), null);
    });

    req.on('timeout', () => {
        req.destroy();
        callback(new Error('Request timed out'), null);
    });

    try {
        req.write(JSON.stringify(message));
        req.end();
    } catch (error) {
        req.destroy();
        callback(error instanceof Error ? error : new Error(error), null);
    }
}

module.exports = {send};