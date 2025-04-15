
/** @typedef {import("../types").Callback} Callback */

const routes = {};
const routesMapping = {};

routes.get = function(configuration, callback) {
    callback = callback || function() { };
    
 
    const serviceName = typeof configuration === 'string' ? configuration : configuration.service || configuration.serviceName;
    
    // console.log(' Getting service:', serviceName);

 
    if (routesMapping[serviceName]) {
        console.log("routesMapping[serviceName]: ", routesMapping[serviceName]);
        callback(null, routesMapping[serviceName]);
        return;
    }
 
    if (global.toLocal && serviceName in global.toLocal) {
 
        callback(null, { call: global.toLocal[serviceName] });
        return;
    }
    // console.log("serviceName in routes.get: ", serviceName);
    console.log("but now all services in routesMapping are: ", routesMapping);
    callback(new Error(`Service ${serviceName} not found!`));
};

routes.put = function(service, name, callback) {
    callback = callback || function() { };
    
    if (!service || !name) {
        callback(new Error('Service and name are required'));
        return;
    }

     
    routesMapping[name] = service;

    console.log("routesMapping[name] in routes.put: ", name, routesMapping[name]);
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