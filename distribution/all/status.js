/**
 * Status service template that creates group-specific instances
 * @param {object} config - Configuration object containing group ID
 * @returns {object} Service instance with group-specific methods
 */
const groups = require('../local/groups');

const status = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  console.log('Creating status service for group:', context.gid);

  return {
    /**
     * Get status information from all nodes in the group
     * @param {string|object} configuration - Status key or configuration
     * @param {function} callback - Callback function
     */
    get: (configuration, callback) => {
      // Get nodes in current group
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
          callback(err, null);
          return;
        }

        const nodes = Object.values(group);
        let responseCount = 0;
        const errors = {};
        const values = {};
        const nids = {};  // Object mapping nodes to nids

        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'status',
            method: 'get'
          };

          global.distribution.local.comm.send([configuration], remote, (err, value) => {
            responseCount++;
            const sid = global.distribution.util.id.getSID(node);
            console.log('Response from node:', sid, err, value);
            //if (err && Object.keys(err).length > 0) {
              if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
              console.log('Error from node:', sid, err);
              errors[sid] = err;
            } else {
              values[sid] = value;
              if (configuration === 'nid') {
                nids[sid] = value;  // Store nid for this node
              }
            }

            if (responseCount === nodes.length) {
              if (configuration === 'nid') {
                callback(
                  Object.keys(errors).length > 0 ? errors : {},
                  nids  // Return node->nid mapping
                );
              } else {
                callback(
                  Object.keys(errors).length > 0 ? errors : {},
                  values
                );
              }
            }
          });
        });
      });
    },

    /**
     * Stop all nodes in the group
     * @param {function} callback - Callback function
     */
    stop: (callback) => {
      console.log('Stopping all nodes in group:', context.gid);
      
      groups.get(context.gid, (err, group) => {
        if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
          console.error(' Error getting group:', err);
          callback(err, null);
          return;
        }

        const nodes = Object.values(group);
        console.log('Found nodes in group:', {
          count: nodes.length,
          nodes: nodes.map(n => `${n.ip}:${n.port}`)
        });

        // Create remote target for status.stop
        const remote = {
          service: 'status',
          method: 'stop'
        };

        // Send stop request to all nodes in group
        let responses = 0;
        const errors = {};
        const values = {};

        nodes.forEach(node => {
          const localRemote = { ...remote, node };
          console.log('Sending stop request to node:', `${node.ip}:${node.port}`);
          
          distribution.local.comm.send([], localRemote, (err, value) => {
            console.log(' Received stop response from node:', {
              node: `${node.ip}:${node.port}`,
              err,
              value
            });
            responses++;
            
            const sid = global.distribution.util.id.getSID(node);
            if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
              errors[sid] = err;
            }
            if (value !== undefined) {
              values[sid] = value;
            }

            // Only call callback when all responses are received
            if (responses === nodes.length) {
              console.log('All stop responses received:', {
                totalResponses: responses,
                errors: Object.keys(errors).length
              });
              
              const hasRealErrors = Object.values(errors).some(err => 
                Object.keys(err).length > 0
              );
              callback(hasRealErrors ? errors : {}, values);
            }
          });
        });
      });
    },

    /**
     * Spawn a new node
     * @param {object} configuration - Node configuration
     * @param {function} callback - Callback function
     */
    spawn: (configuration, callback) => {
      console.log(' Spawning new node in group:', context.gid);
      
      const message = [configuration];
      const remote = {
        service: 'status',
        method: 'spawn'
      };

      global.distribution.all.comm(config).send(message, remote, (errors, values) => {
        if (Object.keys(errors).length > 0) {
          console.error('Errors spawning node:', errors);
          callback(errors, null);
          return;
        }
        callback(null, values);
      });
    }
  };
};

module.exports = status;
