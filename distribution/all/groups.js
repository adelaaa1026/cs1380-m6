const groups = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    /**
     * Get group information from all nodes
     * Each node returns its view of the group
     */
    get: (name, callback) => {
      console.log('[all/groups] Getting group from all nodes:', name);
      
      // First get the nodes in current group
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          console.error('[all/groups] Error getting group:', err);
          callback(err, null);
          return;
        }

        const nodes = Object.values(group);
        console.log('[all/groups] Found nodes:', nodes.map(n => `${n.ip}:${n.port}`));

        // Track responses from each node
        let responseCount = 0;
        const errors = {};
        const values = {};

        // Query each node for their view of the group
        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'groups',
            method: 'get'
          };

          global.distribution.local.comm.send([name], remote, (err, value) => {
            responseCount++;
            const sid = global.distribution.util.id.getSID(node);
            
            if (err) {
              errors[sid] = err;
            }
            if (value) {
              values[sid] = value;
            }

            // Call callback once all nodes respond
            if (responseCount === nodes.length) {
              callback(
                Object.keys(errors).length > 0 ? errors : {},
                values
              );
            }
          });
        });
      });
    },

    /**
     * Update/create group on all nodes
     */
    put: (config, group, callback) => {
      console.log('[all/groups] Putting group on all nodes:', {
        config,
        group: Object.keys(group)
      });

      global.distribution.local.groups.get(context.gid, (err, currentGroup) => {
        if (err) {
          callback(err, null);
          return;
        }

        const nodes = Object.values(currentGroup);
        let responseCount = 0;
        const errors = {};
        const values = {};

        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'groups',
            method: 'put'
          };

          global.distribution.local.comm.send([config, group], remote, (err, value) => {
            responseCount++;
            const sid = global.distribution.util.id.getSID(node);
            
            if (err) {
              errors[sid] = err;
            }
            if (value) {
              values[sid] = value;
            }

            if (responseCount === nodes.length) {
              callback(
                Object.keys(errors).length > 0 ? errors : {},
                values
              );
            }
          });
        });
      });
    },

    /**
     * Delete group from all nodes
     */
    del: (name, callback) => {
      console.log('[all/groups] Deleting group from all nodes:', name);

      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const nodes = Object.values(group);
        let responseCount = 0;
        const errors = {};
        const values = {};

        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'groups',
            method: 'del'
          };

          global.distribution.local.comm.send([name], remote, (err, value) => {
            responseCount++;
            const sid = global.distribution.util.id.getSID(node);
            
            if (err) {
              errors[sid] = err;
            }
            if (value) {
              values[sid] = value;
            }

            if (responseCount === nodes.length) {
              callback(
                Object.keys(errors).length > 0 ? errors : {},
                values
              );
            }
          });
        });
      });
    },

    /**
     * Add node to group on all nodes
     */
    add: (name, node, callback) => {
      console.log('[all/groups] Adding node to group on all nodes:', {
        group: name,
        node: `${node.ip}:${node.port}`
      });

      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const nodes = Object.values(group);
        let responseCount = 0;
        const errors = {};
        const values = {};

        nodes.forEach(currentNode => {
          const remote = {
            node: currentNode,
            service: 'groups',
            method: 'add'
          };

          global.distribution.local.comm.send([name, node], remote, (err, value) => {
            responseCount++;
            const sid = global.distribution.util.id.getSID(currentNode);
            
            if (err) {
              errors[sid] = err;
            }
            if (value) {
              values[sid] = value;
            }

            if (responseCount === nodes.length) {
              callback(
                Object.keys(errors).length > 0 ? errors : {},
                values
              );
            }
          });
        });
      });
    },

    /**
     * Remove node from group on all nodes
     */
    rem: (name, node, callback) => {
      console.log('[all/groups] Removing node from group on all nodes:', {
        group: name,
        node: `${node.ip}:${node.port}`
      });

      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const nodes = Object.values(group);
        let responseCount = 0;
        const errors = {};
        const values = {};

        nodes.forEach(currentNode => {
          const remote = {
            node: currentNode,
            service: 'groups',
            method: 'rem'
          };

          global.distribution.local.comm.send([name, node], remote, (err, value) => {
            responseCount++;
            const sid = global.distribution.util.id.getSID(currentNode);
            
            if (err) {
              errors[sid] = err;
            }
            if (value) {
              values[sid] = value;
            }

            if (responseCount === nodes.length) {
              callback(
                Object.keys(errors).length > 0 ? errors : {},
                values
              );
            }
          });
        });
      });
    }
  };
};

module.exports = groups;
