const serialization = require('@brown-ds/distribution/distribution/util/serialization');
const crypto = require('crypto');

function mr() {
  return {
    /**
     * Register map and reduce services for a MapReduce job
     * @param {Object} config - Configuration object containing map/reduce functions and job ID
     * @param {Function} callback - Callback function to handle errors and results
     */
    registerMapReduce: (config, callback) => {
      callback = callback || function() {};
      
      try {
        const { mapFn, reduceFn, jobId, coordinatorNode, gid, allNodes } = config;
        console.log("coordinatorNode: ", coordinatorNode);
        const groupId = gid || 'local'; // Use the provided group ID or default to 'local'
        console.log("config in mr: ", config);
        console.log(`[MR-${jobId}] Registering MapReduce for group: ${groupId}`);
        
        // Convert string functions back to actual functions
        const mapFunction = serialization.deserialize(mapFn);
        const reduceFunction = serialization.deserialize(reduceFn);
        console.log("mapFunction: ", mapFunction);
        console.log(`[MR-${jobId}] Coordinator node is:`, coordinatorNode);
        
        // Get the current node ID for unique storage keys
        const nodeId = global.distribution.util.id.getSID(global.nodeConfig);
        console.log(`[MR-${jobId}] Current node ID: ${nodeId}`);
        
        // Store for intermediate map results
        const mapResults = [];
        
        // Store for shuffled data (key -> values[])
        const shuffledData = {};
        
        // Create map service
        const mapService = {
          process: (keys) => {
            console.log(`[MR-${jobId}] Processing keys in group ${groupId}:`, keys);
            let processedCount = 0;
            
            // Handle empty keys array
            if (keys.length === 0) {
              notifyCoordinator({ phase: 'map' });
              return;
            }
            
            keys.forEach(key => {
              console.log(`[MR-${jobId}] Getting key ${key} from group ${groupId}`);
              
              // Use the correct store based on the group ID
              const storeService = groupId === 'local' ? 
                global.distribution.local.store : 
                global.distribution[groupId].store;
              
              storeService.get(key, (err, value) => {
                console.log(`[MR-${jobId}] Result for key ${key}:`, err, value);
                
                if (value) {
                  try {
                    console.log(`[MR-${jobId}] Mapping key ${key} with value:`, value);
                    const mapResult = mapFunction(key, value);
                    console.log(`[MR-${jobId}] Map result:`, mapResult);
                    
                    // Store map results in memory
                    mapResults.push(...mapResult);
                  } catch (e) {
                    console.error(`[MR-${jobId}] Error in map function:`, e);
                  }
                } else {

                  console.error(`[MR-${jobId}] Error getting key ${key}:`, err);
                }
                
                processedCount++;
                console.log(`[node-${nodeId}] Processed ${processedCount} of ${keys.length} keys`);
                if (processedCount >= keys.length) {
                  console.log(`[MR-${jobId}] All keys processed, storing map results`);
                  
                  // Store all map results as a single value in the local store with node-specific key
                  const mapResultsKey = `${jobId}-map-results-${nodeId}`;
                  global.distribution.local.store.put(mapResults, mapResultsKey, (err) => {
                    if (err) {
                      console.error(`[MR-${jobId}] Error storing map results:`, err);
                    } else {
                      console.log(`[MR-${jobId}] Stored all map results with key: ${mapResultsKey}`);
                      console.log("mapResults: ", mapResults);
                    }
                    
                    // Notify coordinator that mapping is complete
                    notifyCoordinator({ phase: 'map' });
                  });
                }
              });
            });
          }
        };
        
        // Create shuffle service
        const shuffleService = {
          process: (data) => {
            console.log(`[MR-${jobId}] Starting shuffle phase`);
            const nodes = data.nodes || allNodes;
            
            if (!nodes || nodes.length === 0) {
              console.error(`[MR-${jobId}] No nodes provided for shuffling`);
              notifyCoordinator({ phase: 'shuffle', error: 'No nodes provided for shuffling' });
              return;
            }
            
            // Retrieve the map results from the local store using node-specific key
            const mapResultsKey = `${jobId}-map-results-${nodeId}`;
            global.distribution.local.store.get(mapResultsKey, (err, results) => {
              // if (err || !results) {
              //   console.error(`[MR-${jobId}] Error retrieving map results:`, err);
              //   // Try to use in-memory results if available
              //   if (mapResults.length > 0) {
              //     console.log(`[MR-${jobId}] Using in-memory map results for shuffling`);
              //     shuffleMapResults(mapResults);
              //   } else {
              //     notifyCoordinator({ phase: 'shuffle', error: 'Failed to retrieve map results' });
              //   }
              //   return;
              // }
               shuffleMapResults(results);
            });
            
            function shuffleMapResults(results) {
              console.log(`[MR-${jobId}] Shuffling ${results.length} map results to ${nodes.length} nodes`);
              
              // Group results by key for local tracking
              const keyGroups = {};
              
              // If no results to shuffle, notify completion
              if (!results || results.length === 0) {
                notifyCoordinator({ phase: 'shuffle' });
                return;
              }
              
              // Track shuffle progress
              let shuffledCount = 0;
              const totalPairs = results.length;
              
              // Get node IDs for consistent hashing
              const nodeIds = nodes.map(node => global.distribution.util.id.getNID(node));
              
              // Process each map result and send to appropriate node
              console.log("starting shuffling, results in shuffle: ", results);
              results.forEach(result => {
                for (const key in result) {
                  keyGroups[key] = true; // Mark this key as processed
                  
                  // Use consistent hash from id.js to determine which node gets this key
                  const targetNid = global.distribution.util.id.consistentHash(key, nodeIds);
                  const targetNode = nodes.find(node => 
                    global.distribution.util.id.getNID(node) === targetNid
                  );
                  
                  console.log(`[MR-${jobId}] Key ${key} hashed to node:`, targetNode);
                  
                  // If this is the target node, store locally
                  if (JSON.stringify(targetNode) === JSON.stringify(global.nodeConfig)) {
                    console.log(`[MR-${jobId}] Storing key ${key} locally for reduce phase`);
                    if (!shuffledData[key]) {
                      shuffledData[key] = [];
                    }
                    shuffledData[key].push(result[key]);
                    
                    shuffledCount++;
                    checkShuffleCompletion();
                  } else {
                    // Otherwise, send to the target node
                    const remote = {
                      node: targetNode,
                      service: jobId + '-shuffle-receive',
                      method: 'process'
                    };
                    
                    console.log(`[MR-${jobId}] Sending key, value ${key}, ${result[key]} to node:`, targetNode);
                    global.distribution.local.comm.send([{ key, value: result[key] }], remote, (err) => {
                      if (err) {
                        console.error(`[MR-${jobId}] Error sending shuffle data:`, err);
                      }
                      
                      shuffledCount++;
                      checkShuffleCompletion();
                    });
                  }
                }
              });
              
              function checkShuffleCompletion() {
                console.log(`[MR-${jobId}] Shuffle progress: ${shuffledCount}/${totalPairs}`);
                if (shuffledCount >= totalPairs) {
                  console.log(`[MR-${jobId}] All data shuffled, storing shuffle manifest`);
                  
                  // Store all shuffled data as a single value with node-specific key
                  const shuffledDataKey = `${jobId}-shuffled-data-${nodeId}`;
                  global.distribution.local.store.put(shuffledData, shuffledDataKey, (err) => {
                    if (err) {
                      console.error(`[MR-${jobId}] Error storing shuffled data:`, err);
                    } else {
                      console.log(`[MR-${jobId}] Stored all shuffled data with key: ${shuffledDataKey}`);
                    }
                    console.log("keys in keyGroups: ", keyGroups);
                    // Store a manifest of all shuffle keys for this job with node-specific key
                    const shuffleManifest = {
                      jobId: jobId,
                      keys: Object.keys(keyGroups)
                    };
                    
                    const shuffleManifestKey = `${jobId}-shuffle-manifest-${nodeId}`;
                    global.distribution.local.store.put(shuffleManifest, shuffleManifestKey, (err) => {
          if (err) {
                        console.error(`[MR-${jobId}] Error storing shuffle manifest:`, err);
          } else {
                        console.log(`[MR-${jobId}] Stored shuffle manifest with key: ${shuffleManifestKey}`);
                      }
                      
                      // Notify coordinator that shuffling is complete
                      notifyCoordinator({ phase: 'shuffle' });
                    });
                  });
                }
              }
            }
          }
        };
        
        // Create shuffle-receive service to accept data from other nodes
        const shuffleReceiveService = {
          process: (data) => {
            const { key, value } = data;
            console.log(`[MR-${jobId}] Received shuffled data: ${key} ${value}`);
            
            if (!shuffledData[key]) {
              shuffledData[key] = [];
            }
            shuffledData[key].push(value);
            console.log(`[MR-${jobId}] Shuffled data after receiving: ${shuffledData} `);
          }
        };
            
            // Create reduce service
            const reduceService = {
          process: (data) => {
            console.log(`[MR-${jobId}] Processing reduce data`);
            
            // Retrieve the shuffled data from the local store using node-specific key
            const shuffledDataKey = `${jobId}-shuffled-data-${nodeId}`;
            global.distribution.local.store.get(shuffledDataKey, (err, data) => {
              if (err || !data) {
                console.log(`[MR-${jobId}] No shuffled data found in store, using in-memory data`);
                processReduceData(shuffledData);
                return;
              }
              
              console.log(`[MR-${jobId}] Retrieved shuffled data:`, Object.keys(data));
              processReduceData(data);
            });
            
            function processReduceData(data) {
              console.log(`[MR-${jobId}] Processing reduce data:`, Object.keys(data));
                const results = [];
                
              for (const [key, values] of Object.entries(data)) {
                  try {
                  console.log(`[MR-${jobId}] Reducing key ${key} with values:`, values);
                    const reduceResult = reduceFunction(key, values);
                  console.log(`[MR-${jobId}] Reduce result for key ${key}:`, reduceResult);
                    results.push(reduceResult);
                  } catch (e) {
                  console.error(`[MR-${jobId}] Error in reduce function for key ${key}:`, e);
                }
              }
              
              // Store all reduce results as a single value with node-specific key
              const reduceResultsKey = `${jobId}-reduce-results-${nodeId}`;
              global.distribution.local.store.put(results, reduceResultsKey, (err) => {
                if (err) {
                  console.error(`[MR-${jobId}] Error storing reduce results:`, err);
                } else {
                  console.log(`[MR-${jobId}] Stored all reduce results with key: ${reduceResultsKey}`);
                }
                
                // Notify coordinator that reduction is complete
                notifyCoordinator({ phase: 'reduce', results });
              });
            }
          }
        };
        
        // Helper function to notify coordinator
        function notifyCoordinator(data) {
                const remote = {
            node: coordinatorNode || global.nodeConfig,
                  service: jobId,
                  method: 'notify'
                };
                
          console.log(`[MR-${jobId}] Notifying coordinator of ${data.phase} completion:`, remote.node);
          global.distribution.local.comm.send([data], remote, (err) => {
            // if (err) {
            //   console.error(`[MR-${jobId}] Error notifying coordinator:`, err);
            // }
          });
        }
        
        // Register all services locally
        global.distribution.local.routes.put(mapService, jobId + '-map', (err) => {
          if (err) {
            console.error(`[MR-${jobId}] Error registering map service:`, err);
            callback(err, null);
            return;
          }
          
          console.log(`[MR-${jobId}] Map service registered with ID: ${jobId}-map`);
          
          global.distribution.local.routes.put(shuffleService, jobId + '-shuffle', (err) => {
            if (err) {
              console.error(`[MR-${jobId}] Error registering shuffle service:`, err);
              callback(err, null);
              return;
            }
            
            console.log(`[MR-${jobId}] Shuffle service registered with ID: ${jobId}-shuffle`);
            
            global.distribution.local.routes.put(shuffleReceiveService, jobId + '-shuffle-receive', (err) => {
              if (err) {
                console.error(`[MR-${jobId}] Error registering shuffle-receive service:`, err);
                callback(err, null);
                return;
              }
              
              console.log(`[MR-${jobId}] Shuffle-receive service registered with ID: ${jobId}-shuffle-receive`);
              
              global.distribution.local.routes.put(reduceService, jobId + '-reduce', (err) => {
                if (err) {
                  console.error(`[MR-${jobId}] Error registering reduce service:`, err);
                callback(err, null);
              } else {
                  console.log(`[MR-${jobId}] Reduce service registered with ID: ${jobId}-reduce`);
                callback(null, { success: true });
              }
              });
            });
          });
        });
      } catch (error) {
        console.error(`Error in registerMapReduce:`, error);
        callback(error, null);
      }
    }
  };
}

module.exports = mr;
