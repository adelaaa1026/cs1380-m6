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
    console.log('[local/comm] Starting send with:', {
        message,
        remote: {
            ...remote,
            node: remote.node ? `${remote.node.ip}:${remote.node.port}` : undefined
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

    console.log('[local/comm] Request options:', options);

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });
         
        res.on('end', () => {
            console.log('[local/comm] Raw response:', {
                length: data.length,
                data
            });

            try {
                const result = JSON.parse(data);
                console.log('[local/comm] Parsed result:', result);
                callback(
                    result.error ? new Error(result.error) : {},
                    result.value
                );
            } catch (error) {
                console.error('[local/comm] Error parsing response:', {
                    error,
                    data
                });
                callback(new Error('Failed to parse response'), null);
            }
        });
    });

    req.on('error', (error) => {
        console.error('[local/comm] Request error:', error);
        req.destroy();
        callback(error instanceof Error ? error : new Error(error), null);
    });

    req.on('timeout', () => {
        console.error('[local/comm] Request timeout');
        req.destroy();
        callback(new Error('Request timed out'), null);
    });

    try {
        req.write(JSON.stringify(message));
        req.end();
    } catch (error) {
        console.error('[local/comm] Error sending request:', error);
        req.destroy();
        callback(error instanceof Error ? error : new Error(error), null);
    }
}

module.exports = {send};