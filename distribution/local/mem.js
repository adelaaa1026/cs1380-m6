const util = require('../util/util');
const id = require('../util/id');

// Modified storage to use Map of Maps for group separation
const storage = new Map(); // gid -> Map(key -> value)

function getGroupStorage(gid) {
  if (!storage.has(gid)) {
    storage.set(gid, new Map());
  }
  return storage.get(gid);
}

function put(state, configuration, callback) {
  try {
    let key, gid;
    
    if (configuration === null) {
      // For null configuration, use local group and generate key from state
      gid = 'local';
      key = id.getID(state);
    } else {
      // Handle both string and object configurations
      gid = typeof configuration === 'object' ? configuration.gid : 'local';
      key = typeof configuration === 'object' ? configuration.key : configuration;
    }
    
    const groupStorage = getGroupStorage(gid);
    groupStorage.set(key, state);
    console.log(`Storing in group ${gid}:`, key, state);
    callback(null, state);
  } catch (error) {
    callback(error, null);
  }
}

function get(configuration, callback) {
  try {
    console.log("get function called with configuration: ", configuration);
    console.log("current storage: ", storage);
    // If configuration is null, return all keys from local group
    if (configuration === null) {
      const groupStorage = getGroupStorage('local');
      const allKeys = Array.from(groupStorage.keys());
      callback(null, allKeys);
      return;
    }

    // Handle both string and object configurations
    const gid = typeof configuration === 'object' ? configuration.gid : 'local';
    const key = typeof configuration === 'object' ? configuration.key : configuration;
    

    const groupStorage = getGroupStorage(gid);
    if (key === null) {
      const allKeys = Array.from(groupStorage.keys());
      callback(null, allKeys);
      return;
    }
    const value = groupStorage.get(key);
    console.log("key is: ", key);
    console.log("group storage: ", groupStorage);
    // console.log("value is: ", value);
    if (value === undefined) {
      callback(new Error(`Key not found in group ${gid}`), null);
      return;
    }
    callback(null, value);
  } catch (error) {
    callback(error, null);
  }
}

function del(configuration, callback) {
  try {
    const gid = typeof configuration === 'object' ? configuration.gid : 'local';
    const key = typeof configuration === 'object' ? configuration.key : configuration;

    const groupStorage = getGroupStorage(gid);
    const value = groupStorage.get(key);
    
    if (value === undefined) {
      callback(new Error(`Key not found in group ${gid}`), null);
      return;
    }
    
    groupStorage.delete(key);
    callback(null, value);
  } catch (error) {
    callback(error, null);
  }
}

module.exports = {put, get, del};
