const serialization  = require('@brown-ds/distribution/distribution/util/serialization');
/** @typedef {import("../types").Callback} Callback */

/**
 * Map functions used for mapreduce
 * @callback Mapper
 * @param {any} key
 * @param {any} value
 * @returns {object[]}
 */

/**
 * Reduce functions used for mapreduce
 * @callback Reducer
 * @param {any} key
 * @param {Array} value
 * @returns {object}
 */

/**
 * @typedef {Object} MRConfig
 * @property {Mapper} map
 * @property {Reducer} reduce
 * @property {string[]} keys
 */


/*
  Note: The only method explicitly exposed in the `mr` service is `exec`.
  Other methods, such as `map`, `shuffle`, and `reduce`, should be dynamically
  installed on the remote nodes and not necessarily exposed to the user.
*/

function mr(config) {
  const context = {
    gid: config.gid || 'all',
  };

  /**
   * @param {MRConfig} configuration
   * @param {Callback} cb
   * @return {void}
   */
  function exec(configuration, cb) {
    // Generate a unique ID for this MapReduce job
    const jobId = 'mr-' + Math.random().toString(36).substring(2, 15);
    console.log(`[MR-${jobId}] Starting MapReduce job`);
    
    // Get the group nodes
    global.distribution.local.groups.get(context.gid, (err, group) => {
      console.log(`[MR-${jobId}] Got group nodes for ${context.gid}:`, Object.keys(group));
      if (err) {
        console.error(`[MR-${jobId}] Error getting group nodes:`, err);
        cb(err, null);
        return;
      }
      
      const nodes = Object.values(group);
      if (nodes.length === 0) {
        console.error(`[MR-${jobId}] No nodes in group ${context.gid}`);
        cb(new Error('No nodes in group'), null);
        return;
      }
      
      // Track responses from nodes
      let mapResponses = 0;
      let shuffleResponses = 0;
      let reduceResponses = 0;
      let reduceResults = [];
      
      // Register the coordinator service to receive notifications
      const coordinatorService = {
        notify: (data) => {
          console.log(`[MR-${jobId}] Notification received:`, data.phase);
          
          if (data.phase === 'map') {
            mapResponses++;
            console.log(`[MR-${jobId}] Map response ${mapResponses}/${nodes.length}`);
            
            // When all map tasks are done, start the shuffle phase
            if (mapResponses === nodes.length) {
              console.log(`[MR-${jobId}] All map tasks completed, starting shuffle phase`);
              
              // Tell all nodes to start shuffling their map results
              nodes.forEach(node => {
                const remote = {
                  node: node,
                  service: jobId + '-shuffle',
                  method: 'process'
                };
                
                console.log(`[MR-${jobId}] Sending shuffle command to node:`, node);
                global.distribution.local.comm.send([{ nodes: nodes }], remote, (err) => {

                  if (err) {
                    
                    console.error(`[MR-${jobId}] Error sending shuffle command:`, err);
                  }
                });
              });
            }
          } else if (data.phase === 'shuffle') {
            shuffleResponses++;
            console.log(`[MR-${jobId}] Shuffle response ${shuffleResponses}/${nodes.length}`);
            
            // When all shuffle tasks are done, start the reduce phase
            if (shuffleResponses === nodes.length) {
              console.log(`[MR-${jobId}] All shuffle tasks completed, starting reduce phase`);
              
              // Tell all nodes to start reducing their shuffled data
              nodes.forEach(node => {
                const remote = {
                  node: node,
                  service: jobId + '-reduce',
                  method: 'process'
                };
                
                console.log(`[MR-${jobId}] Sending reduce command to node:`, node);
                global.distribution.local.comm.send([], remote, (err) => {
                  if (err) {
                    console.error(`[MR-${jobId}] Error sending reduce command:`, err);
                  }
                });
              });
            }
          } else if (data.phase === 'reduce') {
            reduceResponses++;
            console.log(`[MR-${jobId}] Reduce response ${reduceResponses}/${nodes.length}`);
            
            if (data.results) {
              console.log(`[MR-${jobId}] Received reduce results:`, data.results);
              reduceResults = reduceResults.concat(data.results);
            }
            
            // When all reduce tasks are done, return the results
            if (reduceResponses === nodes.length) {
              console.log(`[MR-${jobId}] All reduce tasks completed, cleaning up services`);
              cb(null, reduceResults);
            }
          }
        }
      };
      
      // Register the coordinator service
      console.log(`[MR-${jobId}] Registering coordinator service`);
      global.distribution.local.routes.put(coordinatorService, jobId, (err) => {
        if (err) {
          console.error(`[MR-${jobId}] Error registering coordinator service:`, err);
          cb(err, null);
          return;
        }
        
        // Register map and reduce services on ALL nodes
        console.log(`[MR-${jobId}] Registering MapReduce on ${nodes.length} nodes`);
        let registeredNodes = 0;
        
        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'mr',
            method: 'registerMapReduce'
          };
          
          // Send the map and reduce functions to each node
          console.log(`[MR-${jobId}] Sending MapReduce functions to node:`, node);
          console.log("gid in mr: ", context.gid);
          global.distribution.local.comm.send([{
            mapFn: serialization.serialize(configuration.map),
            reduceFn: serialization.serialize(configuration.reduce),
            jobId: jobId,
            coordinatorNode: global.coordinatorNode || global.nodeConfig,
            gid: context.gid,
            allNodes: nodes
          }], remote, (err) => {
            if (err) {
              console.error(`[MR-${jobId}] Error registering MapReduce on node:`, node, err);
            } else {
              console.log(`[MR-${jobId}] MapReduce registered on node:`, node);
              registeredNodes++;
              
              // After all nodes are registered, distribute map tasks
              if (registeredNodes === nodes.length) {
                console.log(`[MR-${jobId}] All nodes registered, distributing map tasks`);
                
                // Distribute map tasks to all nodes
                const keysPerNode = Math.ceil(configuration.keys.length / nodes.length);
                console.log(`[MR-${jobId}] Distributing ${configuration.keys.length} keys across ${nodes.length} nodes (${keysPerNode} per node)`);
                
                nodes.forEach((node, index) => {
                  const startIdx = index * keysPerNode;
                  const endIdx = Math.min(startIdx + keysPerNode, configuration.keys.length);
                  const nodeKeys = configuration.keys.slice(startIdx, endIdx);
                  
                  console.log(`[MR-${jobId}] Node ${index} assigned keys:`, nodeKeys);
                  
                  if (nodeKeys.length > 0) {
                    const remote = {
                      node: node,
                      service: jobId + '-map',
                      method: 'process'
                    };
                    console.log(`[MR-${jobId}] Sending map task to node:`, node);
                    global.distribution.local.comm.send([nodeKeys], remote, (err) => {
                      if (err) {
                        console.error(`[MR-${jobId}] Error sending map task:`, err);
                      }
                    });
                  } else {
                    // If no keys for this node, still notify to maintain count
                    console.log(`[MR-${jobId}] No keys for node ${index}, sending empty notification`);
                    const remote = {
                      node: global.nodeConfig,
                      service: jobId,
                      method: 'notify'
                    };
                    
                    global.distribution.local.comm.send([{ phase: 'map', results: [] }], remote, () => {});
                  }
                });
              }
            }
          });
        });
      });
    });
  }

  return {exec};
}

module.exports = mr;
