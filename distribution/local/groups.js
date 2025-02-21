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
        group: Object.keys(group)
    });

    if (!gid) {
        callback(new Error('Group ID is required'), null);
        return;
    }

    // 1. Store group locally
    groups[gid] = group;
    
    // 2. Create new field in distribution object
    if (!global.distribution[gid]) {
        global.distribution[gid] = {};
    }

    // 3. Instantiate services from templates
    // Get all service templates available in distribution.all
    const availableServices = Object.keys(global.distribution.all);
    console.log('[local/groups] Available services:', availableServices);

    availableServices.forEach(serviceName => {
        try {
            // Get service template
            const serviceTemplate = require(`../all/${serviceName}`);
            
            // Create new instance with group context
            global.distribution[gid][serviceName] = serviceTemplate({
                gid: gid
            });

            console.log(`[local/groups] Created ${serviceName} service for group ${gid}`);
        } catch (error) {
            console.error(`[local/groups] Error creating ${serviceName} service:`, error);
        }
    });

    callback(null, group);
};

groups.del = function(name, callback) {
    console.log(`Deleting group: ${name}`);
    if (groups[name]) {
        const deletedGroup = groups[name];
        delete groups[name];
        callback(null, deletedGroup);
    } else {
        console.error(`[local/groups] Group not found: ${name}`);
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