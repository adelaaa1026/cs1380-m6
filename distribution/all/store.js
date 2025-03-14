const store = function(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  return {
    get: (configuration, callback) => {
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }
        console.log("configuration in store.get: ", configuration);
        if (configuration === null) {
          const allKeys = new Set();
          let nodesProcessed = 0;
          const nodes = Object.values(group);

          if (nodes.length === 0) {
            callback(null, []);
            return;
          }

          nodes.forEach(node => {
            const remote = {
              node: node,
              service: 'store',
              method: 'get'
            };

            const message = [{
              key: null,
              gid: context.gid
            }];

            global.distribution.local.comm.send(message, remote, (err, keys) => {
              nodesProcessed++;
              
              if (!err && keys) {
                console.log("keys in store.get: ", keys);
                if (keys != {}) {
                  keys.forEach(key => allKeys.add(key));
                }
              }

              if (nodesProcessed === nodes.length) {
                console.log("returningallKeys: ", allKeys);
                callback({}, Array.from(allKeys));
              }
            });
          });
          return;
        }

        const kid = global.distribution.util.id.getID(configuration);
        const nodeIds = Object.values(group).map(node => 
          global.distribution.util.id.getNID(node)
        );
        const targetNid = context.hash(kid, nodeIds);

        const targetNode = Object.values(group).find(node => 
          global.distribution.util.id.getNID(node) === targetNid
        );

        if (!targetNode) {
          callback(new Error('Target node not found'), null);
          return;
        }

        const remote = {
          node: targetNode,
          service: 'store',
          method: 'get'
        };

        const message = [{
          key: configuration,
          gid: context.gid
        }];

        global.distribution.local.comm.send(message, remote, callback);
      });
    },

    put: (state, configuration, callback) => {
      console.log("in global store put: ", state, configuration);
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        if (configuration === null) {
          configuration = global.distribution.util.id.getID(state);
        }

        const kid = global.distribution.util.id.getID(configuration);
        const nodeIds = Object.values(group).map(node => 
          global.distribution.util.id.getNID(node)
        );
        const targetNid = context.hash(kid, nodeIds);

        const targetNode = Object.values(group).find(node => 
          global.distribution.util.id.getNID(node) === targetNid
        );

        if (!targetNode) {
          callback(new Error('Target node not found'), null);
          return;
        }

        const remote = {
          node: targetNode,
          service: 'store',
          method: 'put'
        };

        const message = [state, {
          key: configuration,
          gid: context.gid
        }];
        console.log("message in global store put: ", message);
        global.distribution.local.comm.send(message, remote, callback);
      });
    },

    del: (configuration, callback) => {
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const kid = global.distribution.util.id.getID(configuration);
        const nodeIds = Object.values(group).map(node => 
          global.distribution.util.id.getNID(node)
        );
        const targetNid = context.hash(kid, nodeIds);

        const targetNode = Object.values(group).find(node => 
          global.distribution.util.id.getNID(node) === targetNid
        );

        if (!targetNode) {
          callback(new Error('Target node not found'), null);
          return;
        }

        const remote = {
          node: targetNode,
          service: 'store',
          method: 'del'
        };

        const message = [{
          key: configuration,
          gid: context.gid
        }];

        global.distribution.local.comm.send(message, remote, callback);
      });
    },

    reconf: (configuration, callback) => {
      callback(null, {});
    }
  };
};

module.exports = store;
