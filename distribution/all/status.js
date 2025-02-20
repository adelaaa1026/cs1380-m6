/**
 * Status service template that creates group-specific instances
 * @param {object} config - Configuration object containing group ID
 * @returns {object} Service instance with group-specific methods
 */
const status = function(config) {
  const context = { gid: config.gid || 'all' };

  console.log('[all/status] Creating status service for group:', context.gid);

  return {
    /**
     * Get status information from all nodes in the group
     * @param {string|object} configuration - Status key or configuration
     * @param {function} callback - Callback function
     */
    get: (configuration, callback) => {
      console.log('[all/status] Getting status for group:', context.gid);
      
      // Use all/comm to send request to all nodes in the group
      const message = [configuration];
      const remote = {
        service: 'status',
        method: 'get'
      };

      global.distribution.all.comm(config).send(message, remote, (errors, values) => {
        if (Object.keys(errors).length > 0) {
          console.error('[all/status] Errors getting status:', errors);
          callback(errors, null);
          return;
        }
        callback(null, values);
      });
    },

    /**
     * Stop all nodes in the group
     * @param {function} callback - Callback function
     */
    stop: (callback) => {
      console.log('[all/status] Stopping all nodes in group:', context.gid);
      
      const message = [];
      const remote = {
        service: 'status',
        method: 'stop'
      };

      global.distribution.all.comm(config).send(message, remote, (errors, values) => {
        if (Object.keys(errors).length > 0) {
          console.error('[all/status] Errors stopping nodes:', errors);
          callback(errors, null);
          return;
        }
        callback(null, values);
      });
    },

    /**
     * Spawn a new node
     * @param {object} configuration - Node configuration
     * @param {function} callback - Callback function
     */
    spawn: (configuration, callback) => {
      console.log('[all/status] Spawning new node in group:', context.gid);
      
      const message = [configuration];
      const remote = {
        service: 'status',
        method: 'spawn'
      };

      global.distribution.all.comm(config).send(message, remote, (errors, values) => {
        if (Object.keys(errors).length > 0) {
          console.error('[all/status] Errors spawning node:', errors);
          callback(errors, null);
          return;
        }
        callback(null, values);
      });
    }
  };
};

module.exports = status;
