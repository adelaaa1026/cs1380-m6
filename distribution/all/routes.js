const serialization  = require('@brown-ds/distribution/distribution/util/serialization');
// const {serialize} = require("../util/serialization");
/** @typedef {import("../types").Callback} Callback */
// serialize = require('@brown-ds/distribution/distribution/local/status').spawn

function routes(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * Put route on all nodes in the group
   * @param {object} service
   * @param {string} name
   * @param {Callback} callback
   */
  function put(service, name, callback = () => {}) {
    console.log("service: ", service);
    global.distribution.local.groups.get(context.gid, (err, group) => {
      if (err && !group) {
        callback(err, null);
        return;
      }

      const nodes = Object.values(group);
      let responseCount = 0;
      const errors = {};
      const values = {};

      nodes.forEach(node => {
        const remote = {
          node: node,
          service: 'routes',
          method: 'put'
        };

        // const message = [service, name];
        const serializedService = serialization.serialize(service);
        const message = [serializedService, name];

        
        console.log("sending message in routes: ", message);
        global.distribution.local.comm.send(message, remote, (err, value) => {
          console.log("err: ", err);
          console.log("value: ", value);
          responseCount++;
          const sid = global.distribution.util.id.getSID(node);

          if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
            errors[sid] = err;
          } else {
            values[sid] = serialization.deserialize(value);
            console.log("value updated: ", values[sid]);
          }
          console.log("values: ", values);
          // Call callback when all nodes have responded
          if (responseCount === nodes.length) {
            callback(
              Object.keys(errors).length > 0 ? errors : {},
              values
            );
          }
        });
      });
    });
  }

  /**
   * Remove route from all nodes in the group
   * @param {object} service
   * @param {string} name
   * @param {Callback} callback
   */
  function rem(service, name, callback = () => {}) {
    global.distribution.local.groups.get(context.gid, (err, group) => {
      if (err && !group) {
        callback(err, null);
        return;
      }

      const nodes = Object.values(group);
      let responseCount = 0;
      const errors = {};
      const values = {};

      nodes.forEach(node => {
        const remote = {
          node: node,
          service: 'routes',
          method: 'rem'
        };

        const message = [service, name];

        global.distribution.local.comm.send(message, remote, (err, value) => {
          responseCount++;
          const sid = global.distribution.util.id.getSID(node);

          if ((err && Object.keys(err).length > 0) || (err instanceof Error)) {
            errors[sid] = err;
          } else {
            values[sid] = value;
          }

          // we call callback when all nodes have responded
          if (responseCount === nodes.length) {
            callback(
              Object.keys(errors).length > 0 ? errors : {},
              values
            );
          }
        });
      });
    });
  }

  /**
   * Get route from all nodes in the group
   * @param {string|object} name - Route name or configuration object
   * @param {Callback} callback
   */
  function get(name, callback) {
    global.distribution.local.groups.get(context.gid, (err, group) => {
      if (err) {
        callback(err, null);
        return;
      }

      const nodes = Object.values(group);
      let responses = 0;
      const values = {};

      // Extract the actual route name if an object is provided
      let routeName = name;
      if (typeof name === 'object' && name !== null) {
        routeName =  name.service || name;
      }

      nodes.forEach((node) => {
        const remote = {
          node: node,
          service: 'routes',
          method: 'get'
        };

        // Send the appropriate format based on the input type
        // const sendParam = typeof name === 'object' ? [name] : [routeName];
        console.log("routeName: ", routeName);
        global.distribution.local.comm.send([routeName], remote, (err, value) => {
          responses++;
          
          if (!err && value) {
            // Use the serialization library to deserialize the value
            if (typeof value === 'string') {
              try {
                // Deserialize using the utility function
                const deserializedValue = global.distribution.util.deserialize(value);
                values[node.ip + ':' + node.port] = deserializedValue;
              } catch (e) {
                console.error('Error deserializing value:', e);
                values[node.ip + ':' + node.port] = value;
              }
            } else {
              values[node.ip + ':' + node.port] = value;
            }
          }
          
          if (responses === nodes.length) {
            // If we're looking for a specific route, return the first one we find
            if (routeName) {
              for (const nodeId in values) {
                if (values[nodeId]) {
                  callback(null, values[nodeId]);
                  return;
                }
              }
              callback(new Error('Route not found'), null);
            } else {
              // Otherwise return all routes
              callback(null, values);
            }
          }
        });
      });
    });
  }

  return {put, rem, get};
}

module.exports = routes;
