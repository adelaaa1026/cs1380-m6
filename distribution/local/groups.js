const id = require('../util/id'); 

const groups = {};

groups.get = function(name, callback) {
    if (groups[name]) {
        callback(null, groups[name]);
    } else {
        callback(new Error('Group not found'), null);
    }
};

groups.put = function(config, group, callback) {
    const gid = typeof config === 'string' ? config : config.gid;

    if (!gid) {
        callback(new Error('Group ID is required'), null);
        return;
    }

    // store group locally
    groups[gid] = group;
    
    // create new field in distribution object
    if (!global.distribution[gid]) {
        global.distribution[gid] = {};
    }

    // instantate services from templates
 
    const availableServices = Object.keys(global.distribution.all);
    console.log('all available services:', availableServices);

    availableServices.forEach(serviceName => {
        try {
 
            const serviceTemplate = require(`../all/${serviceName}`);
 
            global.distribution[gid][serviceName] = serviceTemplate({
                gid: gid
            });

        } catch (error) {
            console.error(`Error creating ${serviceName} service:`, error);
        }
    });

    callback(null, group);
};

groups.del = function(name, callback) {
    if (groups[name]) {
        const deletedGroup = groups[name];
        delete groups[name];
        callback(null, deletedGroup);
    } else {
        console.error(`Group not found: ${name}`);
        callback(new Error('Group not found'), null);
    }
};

groups.add = function(name, node, callback) {
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