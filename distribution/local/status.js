const log = require('../util/log');

const status = {};

global.moreStatus = {
  sid: global.distribution.util.id.getSID(global.nodeConfig),
  nid: global.distribution.util.id.getNID(global.nodeConfig),
  counts: 0,
};

status.get = function(configuration, callback) {
  callback = callback || function() { };

  // Check if this is a group request by looking at the request path
  const isGroupRequest = global.nodeConfig.gid && global.nodeConfig.gid !== 'local';
  console.log('[local/status] Handling status.get request:', {
    configuration,
    isGroupRequest,
    gid: global.nodeConfig.gid
  });

  if (isGroupRequest) {
    // Get all nodes in the group
    global.distribution.local.groups.get(global.nodeConfig.gid, (err, group) => {
      if (err) {
        console.error('[local/status] Failed to get group:', err);
        callback(err);
        return;
      }

      console.log('[local/status] Found group members:', {
        gid: global.nodeConfig.gid,
        nodes: Object.keys(group)
      });

      if (configuration === 'nid') {
        const nodes = Object.values(group);
        let responses = 0;
        const nids = [];

        // Send local (non-group) status request to each node
        nodes.forEach(node => {
          const remote = {
            node: node,
            service: 'status',
            method: 'get',
            // Important: Don't pass gid to avoid infinite recursion
            gid: 'local'  
          };

          console.log('[local/status] Requesting NID from node:', {
            node: `${node.ip}:${node.port}`,
            remote
          });

          global.distribution.local.comm.send(['nid'], remote, (err, nid) => {
            console.log('[local/status] Received NID response:', {
              node: `${node.ip}:${node.port}`,
              err,
              nid
            });

            responses++;
            if (!err && nid) {
              nids.push(nid);
            }

            if (responses === nodes.length) {
              console.log('[local/status] All NIDs collected:', nids);
              callback(null, nids);
            }
          });
        });
      } else {
        // For non-NID requests, return error or local value
        if (global.moreStatus[configuration] === undefined) {
          callback(new Error('Status key not found'));
        } else {
          callback(null, global.moreStatus[configuration]);
        }
      }
    });
  } else {
    // Handle individual node requests (non-group)
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
  }
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
