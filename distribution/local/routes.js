/** @typedef {import("../types").Callback} Callback */

const routes = {};
const routesMapping = {};

routes.get = function(configuration, callback) {
    callback = callback || function() { };
    
    // Normalize configuration to handle both string and object inputs
    const serviceName = typeof configuration === 'string' ? configuration : configuration.serviceName;
    
    console.log('[local/routes] Getting service:', serviceName);

    // First check regular routes
    if (routesMapping[serviceName]) {
        console.log('[local/routes] Found service in routes:', serviceName);
        callback(null, routesMapping[serviceName]);
        return;
    }

    // If not in routes, check for RPC service
    // global.toLocal is an object/array mapping remote pointers to function pointers
    if (global.toLocal && serviceName in global.toLocal) {
        console.log('[local/routes] Found service in RPC:', serviceName);
        callback(null, { call: global.toLocal[serviceName] });
        return;
    }

    // Service not found in either routes or RPC
    console.error('[local/routes] Service not found:', serviceName);
    callback(new Error(`Service ${serviceName} not found!`));
};

routes.put = function(service, name, callback) {
    callback = callback || function() { };
    
    if (!service || !name) {
        callback(new Error('Service and name are required'));
        return;
    }

    console.log('[local/routes] Registering service:', name);
    routesMapping[name] = service;
    callback(null, service);
};

/**
 * @param {string} configuration 
 * @param {Callback} callback
 */
function rem(configuration, callback) {
    callback = callback || function() { };

    try {
        routesMapping.delete(configuration);
        callback(null);
    } catch (error) {
        callback(error);
    }
}

module.exports = routes;