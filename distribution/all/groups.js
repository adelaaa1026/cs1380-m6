/**
 * Groups service template
 * Creates group-specific instances
 */
const groups = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  console.log('now we are creating groups service for:', context.gid);

  return {
    /**
     * Get group information from all nodes
     * Each node returns its view of the group
     */
    get: (name, callback) => {
      console.log('now we are getting group from all nodes:', name);
      
      // First get the nodes in current group
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err  && Object.keys(err).length > 0) {
          errors[sid] = err instanceof Error ? err : new Error(err.message || err);
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
            method: 'get'
          };

          global.distribution.local.comm.send([name], remote, (err, value) => {
            responseCount++;
            const sid = global.distribution.util.id.getSID(node);
            
            if (err && Object.keys(err).length !== 0) {
              errors[sid] = err instanceof Error ? err : new Error(err);
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

 
    put: (config, group, callback) => {
      console.log('we are putting group on all nodes:', {
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

 
    del: (name, callback) => {
 

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
   
            if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
              errors[sid] = err instanceof Error ? err : new Error(err.message || String(err));
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

   
    rem: (name, node, callback) => {

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