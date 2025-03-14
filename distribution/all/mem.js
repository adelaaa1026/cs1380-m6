const id = require('../util/id');

function mem(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed mem service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err && !group) {
          callback(err, null);
          return;
        }

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
              service: 'mem',
              method: 'get'
            };

            const message = [{
              key: null,
              gid: context.gid
            }];

            global.distribution.local.comm.send(message, remote, (err, keys) => {
              nodesProcessed++;
              
              if (!err && keys) {
                keys.forEach(key => allKeys.add(key));
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
          service: 'mem',
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
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err && !group) {
          callback(err, null);
          return;
        }

        if (configuration === null) {
          configuration = id.getID(state);
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
          service: 'mem',
          method: 'put'
        };

        const message = [state, {
          key: configuration,
          gid: context.gid
        }];

        global.distribution.local.comm.send(message, remote, callback);
      });
    },

    del: (configuration, callback) => {
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err && !group) {
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
          service: 'mem',
          method: 'del'
        };

        const message = [{
          key: configuration,
          gid: context.gid
        }];

        global.distribution.local.comm.send(message, remote, callback);
      });
    },

    reconf: (oldGroup, callback) => {
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const allKeys = new Set();
        let nodesProcessed = 0;
        const nodes = Object.values(group);

        if (nodes.length === 0) {
          callback(null, {});
          return;
        }

        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'mem',
            method: 'get'
          };

          const message = [{
            key: null,
            gid: context.gid
          }];

          global.distribution.local.comm.send(message, remote, (err, nodeKeys) => {
            nodesProcessed++;
            
            if (!err && nodeKeys) {
              nodeKeys.forEach(key => allKeys.add(key));
            }

            if (nodesProcessed === nodes.length) {
              const keys = Array.from(allKeys);
              console.log("Got all keys: ", keys);

              global.distribution.local.groups.get(context.gid, (err, newGroup) => {
                if (err) {
                  callback(err, null);
                  return;
                }

                console.log("newGroup: ", newGroup);
                const oldNodeIds = Object.values(oldGroup).map(node => 
                  global.distribution.util.id.getNID(node)
                );
                const newNodeIds = Object.values(newGroup).map(node => 
                  global.distribution.util.id.getNID(node)
                );

                console.log("keys: ", keys);
                const keysToRelocate = keys.filter(key => {
                  const kid = global.distribution.util.id.getID(key);
                  const oldTargetNid = context.hash(kid, oldNodeIds);
                  const newTargetNid = context.hash(kid, newNodeIds);
                  return oldTargetNid !== newTargetNid;
                });
                console.log("keysToRelocate: ", keysToRelocate);

                let relocatedCount = 0;

                if (keysToRelocate.length === 0) {
                  callback(null, {});
                  return;
                }

                keysToRelocate.forEach(key => {
                  const kid = global.distribution.util.id.getID(key);
                  const oldTargetNid = context.hash(kid, oldNodeIds);
                  const newTargetNid = context.hash(kid, newNodeIds);

                  const sourceNode = Object.values(oldGroup).find(node => 
                    global.distribution.util.id.getNID(node) === oldTargetNid
                  );
                  const destNode = Object.values(newGroup).find(node => 
                    global.distribution.util.id.getNID(node) === newTargetNid
                  );
                  console.log("moving key: ", key, " from ", sourceNode, " to ", destNode);

                  if (!sourceNode || !destNode) {
                    relocatedCount++;
                    if (relocatedCount === keysToRelocate.length) {
                      callback(null, {});
                    }
                    return;
                  }

                  const getRemote = {
                    node: sourceNode,
                    service: 'mem',
                    method: 'get'
                  };

                  const getMessage = [{
                    key: key,
                    gid: context.gid
                  }];

                  global.distribution.local.comm.send(getMessage, getRemote, (err, value) => {
                    if (err) {
                      relocatedCount++;
                      if (relocatedCount === keysToRelocate.length) {
                        callback(null, {});
                      }
                      return;
                    }

                    const delRemote = {
                      node: sourceNode,
                      service: 'mem',
                      method: 'del'
                    };

                    global.distribution.local.comm.send(getMessage, delRemote, (err) => {
                      if (err) {
                        relocatedCount++;
                        if (relocatedCount === keysToRelocate.length) {
                          callback(null, {});
                        }
                        return;
                      }

                      const putRemote = {
                        node: destNode,
                        service: 'mem',
                        method: 'put'
                      };

                      const putMessage = [value, {
                        key: key,
                        gid: context.gid
                      }];

                      global.distribution.local.comm.send(putMessage, putRemote, (err) => {
                        relocatedCount++;
                        if (relocatedCount === keysToRelocate.length) {
                          callback(null, {});
                        }
                      });
                    });
                  });
                });
                console.log("relocatedCount: ", relocatedCount);
              });
            }
          });
        });
      });
    }
  };
}

module.exports = mem;
