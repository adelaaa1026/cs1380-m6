/** @typedef {import("../types").Callback} Callback */

/**
 * NOTE: This Target is slightly different from local.all.Target
 * @typdef {Object} Target
 * @property {string} service
 * @property {string} method
 */

const local = require('../local/comm');
const groups = require('../local/groups');

/**
 * @param {object} config
 * @return {object}
 */
function comm(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {Array} message
   * @param {object} configuration
   * @param {Callback} callback
   */
  function send(message, configuration, callback) {
    const TIMEOUT = 1000; // 5 seconds timeout
    console.log('[all/comm] Sending message:', { message, configuration });
    
    groups.get(context.gid, (err, group) => {
      if (err) {
        console.error('[all/comm] Error getting group:', err);
        callback(err, null);
        return;
      }

      const nodes = Object.values(group);
      console.log('[all/comm] Found nodes:', nodes.length);
      
      if (nodes.length === 0) {
        console.warn('[all/comm] No nodes found in group');
        callback({}, {});
        return;
      }

      let responseCount = 0;
      const errors = {};
      const values = {};
      let timeoutId;
      let isCompleted = false;

      // Function to complete the operation
      const complete = () => {
        if (!isCompleted) {
          console.log('[all/comm] Operation complete:', { errors, values });
          isCompleted = true;
          clearTimeout(timeoutId);
          
          // Only pass non-null errors to callback
          const filteredErrors = {};
          Object.entries(errors).forEach(([key, value]) => {
            if (value !== null) {
              filteredErrors[key] = value;
            }
          });
          
          callback(filteredErrors, values);
        }
      };

      // Set timeout for the entire operation
      timeoutId = setTimeout(() => {
        nodes.forEach(node => {
          const sid = global.distribution.util.id.getSID(node);
          if (!errors[sid] && !values[sid]) {
            errors[sid] = new Error('Timeout waiting for response');
            values[sid] = null; // Ensure values has an entry even for timeouts
          }
        });
        complete();
      }, TIMEOUT);

      // Create a continuation for handling responses from each node
      const handleResponse = (sid) => (error, value) => {
        if (isCompleted) return; // Don't process late responses

        responseCount++;

        // Always store both error and value for each response
        errors[sid] = error || null;
        values[sid] = value !== undefined ? value : null;

        // If all nodes have responded, complete the operation
        if (responseCount === nodes.length) {
          complete();
        }
      };

      // Send message to each node in the group
      nodes.forEach(node => {
        const sid = global.distribution.util.id.getSID(node);
        const remote = {
          ...configuration,
          node: node,
          gid: context.gid
        };

        try {
          local.send(message, remote, handleResponse(sid));
        } catch (error) {
          handleResponse(sid)(error, null);
        }
      });
    });
  }

  return { send };
}

module.exports = comm;
