const log = require('../util/log');

const status = {};

global.moreStatus = {
  sid: global.distribution.util.id.getSID(global.nodeConfig),
  nid: global.distribution.util.id.getNID(global.nodeConfig),
  counts: 0,
};

status.get = function(configuration, callback) {
  callback = callback || function() { };
  if (configuration === 'nid') {
    callback(null, global.moreStatus.nid);
    return;
  }
  if (configuration === 'sid') {
    callback(null, global.moreStatus.sid);
    return;
  }
  if (configuration === 'ip') {
    callback(null, global.nodeConfig.ip);
    return;
  }
  if (configuration === 'port') {
    callback(null, global.nodeConfig.port);
    return;
  }
  if (configuration === 'counts') {
    callback(null, global.moreStatus.counts);
    return;
  }
  if (configuration === 'heapTotal') {
    callback(null, process.memoryUsage().heapTotal);
    return;
  }
  if (configuration === 'heapUsed') {
    callback(null, process.memoryUsage().heapUsed);
    return;
  }

 
  callback(new Error('Status key not found'));z
};

status.spawn = require('@brown-ds/distribution/distribution/local/status').spawn;
// status.spawn = function(configuration, callback) {
//     console.log('[local/status] Spawning node:', configuration);
    
//     // Create a new node-specific config
//     const nodeConfig = {
//         ...configuration,
//         sid: global.distribution.util.id.getSID(configuration),
//         nid: global.distribution.util.id.getNID(configuration)
//     };
    
//     // Set node-specific config (don't save/restore original)
//     global.nodeConfig = nodeConfig;
//     global.moreStatus = {
//         sid: nodeConfig.sid,
//         nid: nodeConfig.nid,
//         counts: 0
//     };

//     // Start the node with its specific config
//     distribution.node.start((server) => {
//         console.log('[local/status] Node started successfully:', nodeConfig);
//         callback(null, true);
//     });
// };

status.stop = require('@brown-ds/distribution/distribution/local/status').stop; 
// status.spawn = function(configuration, callback) {
// };

// status.stop = function(callback) {
// };

module.exports = status;
