/**
 * Status service template that creates group-specific instances
 * @param {object} config - Configuration object containing group ID
 * @returns {object} Service instance with group-specific methods
 */
const groups = require('../local/groups');

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
      if (configuration === 'nid') {
        console.log('[all/status] Getting NIDs for group:', context.gid);
        groups.get(context.gid, (err, group) => {
          if (err) {
            console.error('[all/status] Error getting group:', err);
            callback(err, null);
            return;
          }

          const nodes = Object.values(group);
          console.log('[all/status] Found nodes in group:', {
            count: nodes.length,
            nodes: nodes.map(n => `${n.ip}:${n.port}`)
          });

          // Create remote target for status.get
          const remote = {
            service: 'status',
            method: 'get'
          };

          // Send request to all nodes in group
          let responses = 0;
          const nids = [];
          const errors = {};

          nodes.forEach(node => {
            const localRemote = { ...remote, node };
            console.log('[all/status] Sending NID request to node:', `${node.ip}:${node.port}`);
            distribution.local.comm.send(['nid'], localRemote, (err, nid) => {
              console.log('[all/status] Received response from node:', {
                node: `${node.ip}:${node.port}`,
                err,
                nid
              });
              responses++;
              
              if (err) {
                errors[global.distribution.util.id.getSID(node)] = err;
              }  
              if (nid) {
                nids.push(nid);
              }

              console.log('[all/status] Responses, nodes:', responses, nodes.length);
              console.log('[all/status] nids:', nids);
              
              // Only call callback when all responses are received
              if (responses === nodes.length) {
                console.log('[all/status] All responses received:', {
                  totalResponses: responses,
                  nids: nids.length,
                  errors: Object.keys(errors).length
                });
                const hasRealErrors = Object.values(errors).some(err => 
                  Object.keys(err).length > 0
                );
                callback(hasRealErrors ? errors : {}, nids);
              }
            });
          });
        });
      } else {
        // Handle other status requests normally
        const remote = {service: 'status', method: 'get'};
        distribution.mygroup.comm.send([configuration], remote, callback);
      }
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
