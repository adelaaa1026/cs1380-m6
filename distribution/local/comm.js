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
    console.log('[local/comm] Sending request:', { 
        message, 
        remote: {
            ...remote,
            node: {
                ip: remote.node?.ip,
                port: remote.node?.port
            }
        }
    });

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

    console.log('[local/comm] Making request with options:', options);

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                callback(
                    result.error ? new Error(result.error) : null,
                    result.value
                );
            } catch (error) {
                callback(new Error('Failed to parse response'), null);
            }
        });
    });

    req.on('error', (error) => {
        req.destroy();
        callback(error, null);
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
        callback(new Error('Failed to send request'), null);
    }
}

module.exports = {send};
