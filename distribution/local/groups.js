const id = require('../util/id'); 

const groups = {};

groups.get = function(name, callback) {
    console.log(`[local/groups] Getting group: ${name}`);
    if (groups[name]) {
        console.log(`[local/groups] Found group with ${Object.keys(groups[name]).length} nodes:`, 
            Object.keys(groups[name]));
        callback(null, groups[name]);
    } else {
        console.error(`[local/groups] Group not found: ${name}`);
        callback(new Error('Group not found'), null);
    }
};

groups.put = function(config, group, callback) {
    const gid = typeof config === 'string' ? config : config.gid;
    console.log('[local/groups] Putting group on node:', {
        nodePort: global.nodeConfig.port,
        gid,
        groupSize: group ? Object.keys(group).length : 0,
        groupMembers: group ? Object.keys(group).map(sid => ({
            sid,
            node: group[sid]
        })) : []
    });
    
    if (!gid) {
        console.error('[local/groups] Missing group ID');
        return callback(new Error('Group ID is required'), null);
    }
    
    groups[gid] = group;
    console.log(`[local/groups] Group ${gid} stored successfully`);

    // Dynamically instantiate services for the new group
    console.log(`[local/groups] Creating services for group ${gid}`);
    distribution[gid] = {};
    distribution[gid].status = require('../all/status')({ gid });
    distribution[gid].comm = require('../all/comm')({ gid });

    callback(null, group);
};

groups.del = function(name, callback) {
    console.log(`Deleting group: ${name}`);
    if (groups[name]) {
        const deletedGroup = groups[name];
        delete groups[name];
        callback(null, deletedGroup);
    } else {
        callback(new Error('Group not found'), null);
    }
};

groups.add = function(name, node, callback) {
    console.log(`Adding node to group: ${name}`);
    if (groups[name]) {
        const sid = id.getSID(node);
        groups[name][sid] = node;
        if (callback) {
            callback(null, groups[name]);
        }
    } 
    else {
        if (callback) { 
            callback(new Error('Group not found'), null);
        }
    }
};

groups.rem = function(name, nodeSid, callback) {
    console.log(`Removing node from group: ${name}`);
    if (groups[name]) {
        // const sid = id.getSID(node);
        if (groups[name][nodeSid]) {
            delete groups[name][nodeSid];
            if (callback) {
                callback(null, groups[name]);
            }
        } 
        else {
            if (callback) {
                callback(new Error('Node not found in group'), null);
            }
        }
    } 
    else {
        if (callback) {
                callback(new Error('Group not found'), null);
        }
    }
};

module.exports = groups;
