/** @typedef {import("../types").Callback} Callback */

/**
 * NOTE: This Target is slightly different from local.all.Target
 * @typdef {Object} Target
 * @property {string} service
 * @property {string} method
 */

const local = require('../local/comm');
const groups = require('../local/groups');

/**
 * @param {object} config
 * @return {object}
 */
function comm(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {Array} message
   * @param {object} configuration
   * @param {Callback} callback
   */
  function send(message, remote, callback) {
    const TIMEOUT = 1000;
    console.log('[all/comm] Starting send with:', {
      message,
      remote,
      gid: context.gid
    });

    groups.get(context.gid, (err, group) => {
      if (err) {
        console.error('[all/comm] Error getting group:', err);
        callback(err, null);
        return;
      }

      const nodes = Object.values(group);
      console.log('[all/comm] Found nodes:', nodes.map(n => `${n.ip}:${n.port}`));
      
      let responseCount = 0;
      const errors = {};
      const values = {};
      let isCompleted = false;

      const complete = () => {
        if (!isCompleted) {
          isCompleted = true;
          clearTimeout(timeoutId);
          
          console.log('[all/comm] Completing with:', {
            errors,
            values,
            responseCount
          });

          const hasErrors = Object.values(errors).some(err => 
            err !== null && err instanceof Error
          );

          const hasValues = Object.values(values).some(v => v !== null);
          
          console.log('[all/comm] Status check:', {
            hasErrors,
            hasValues,
            willReturnEmptyValues: hasErrors || !hasValues
          });

          callback(
            hasErrors ? errors : {},
            hasErrors || !hasValues ? {} : values
          );
        }
      };

      const timeoutId = setTimeout(() => {
        console.log('[all/comm] Timeout reached');
        nodes.forEach(node => {
          const sid = global.distribution.util.id.getSID(node);
          if (!errors[sid]) {
            errors[sid] = new Error('Timeout waiting for response');
            values[sid] = null;
          }
        });
        complete();
      }, TIMEOUT);

      nodes.forEach(node => {
        const localRemote = { ...remote, node };
        const sid = global.distribution.util.id.getSID(node);
        
        console.log('[all/comm] Sending to node:', {
          node: `${node.ip}:${node.port}`,
          sid
        });

        distribution.local.comm.send(message, localRemote, (error, value) => {
          responseCount++;
          console.log('[all/comm] Received response from node:', {
            node: `${node.ip}:${node.port}`,
            sid,
            error,
            value,
            responseCount
          });
          
          // if (error) {
          //   console.log("has error: ", error);
          //   errors[sid] = error;
          //   // values[sid] = null;
          // } else {
          //   values[sid] = value;
          // }
          errors[sid] = error;
          values[sid] = value;

          if (responseCount === nodes.length) {
            complete();
          }
        });
      });
    });
  }

  return { send };
}

module.exports = comm;
