/**
 * Groups service template
 * Creates group-specific instances
 */
const groups = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  console.log('[all/groups] Creating groups service for:', context.gid);

  return {
    /**
     * Get group information from all nodes
     * Each node returns its view of the group
     */
    get: (name, callback) => {
      console.log('[all/groups] Getting group from all nodes:', name);
      
      // First get the nodes in current group
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err  && Object.keys(err).length > 0) {
          console.error('[all/groups] Error getting group:', err);
          errors[sid] = err instanceof Error ? err : new Error(err.message || err);
          // console.log('[all/groups] Error from node:', sid, errors[sid]);
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
            
            console.log('[all/groups] Response from node:', sid, err, value);
            if (err && Object.keys(err).length !== 0) {
              errors[sid] = err instanceof Error ? err : new Error(err);
            }
            if (value) {
              values[sid] = value;
            }
            console.log('[all/groups] Errors:', errors);
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
        if (err  && Object.keys(err).length > 0) {
          callback(err, null);
          return;
        }

        const nodes = Object.values(currentGroup);
        let responses = 0;
        const errors = {};
        const values = {};

        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'groups',
            method: 'put'
          };

          global.distribution.local.comm.send([config, group], remote, (err, value) => {
            responses++;
            const sid = global.distribution.util.id.getSID(node);
            
            if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
              errors[sid] = err;
            }
            if (value) {
              values[sid] = value;
            }

            if (responses === nodes.length) {
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
        if (err  && Object.keys(err).length > 0) {
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
            console.log('[all/groups] Response from node:', sid, err, value);
            if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
              errors[sid] = err instanceof Error ? err : new Error(err.message || String(err));
              console.log('[all/groups] Error from node:', sid, errors[sid]);
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
        if (err  && Object.keys(err).length > 0) {
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
            
            if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
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
        if (err  && Object.keys(err).length > 0) {
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
            
            if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
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