/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/

const fs = require('fs');
const path = require('path');
const util = require('../util/util');
const id = require('../util/id');

// Create storage directories for each group
const BASE_STORE_DIR = path.join(__dirname, '../../.store');
if (!fs.existsSync(BASE_STORE_DIR)) {
  fs.mkdirSync(BASE_STORE_DIR);
}

function getGroupDir(gid) {
  const groupDir = path.join(BASE_STORE_DIR, gid);
  if (!fs.existsSync(groupDir)) {
    fs.mkdirSync(groupDir);
  }
  return groupDir;
}

function getFilePath(gid, key) {
  // Handle null key case
  if (key === null) {
    return getGroupDir(gid);
  }
  return path.join(getGroupDir(gid), key.replace(/[^a-zA-Z0-9]/g, ''));
}

function put(value, configuration, callback) {
  try {
    let key, gid;
    
    if (configuration === null) {
      // For null configuration, use local group and generate key from state
      gid = 'local';
      key = id.getID(value);
      console.log("empty key in put: ", key);
    } else {
      // Handle both string and object configurations
      gid = typeof configuration === 'object' ? configuration.gid : 'local';
      // gid = 'local';
      key = typeof configuration === 'object' ? configuration.key : configuration;
      console.log("key in put: ", key);
    }

    const filePath = getFilePath(gid, key);
    const serialized = util.serialize(value);
    if (key === "mr-onnje7m4jfl-map-424-0") {
      console.log("filePath: ", filePath);
      console.log("serialized: ", serialized);
    }
    fs.writeFile(filePath, serialized, 'utf8', (err) => {
      if (err) {
        callback(err, null);
        return;
      }
      console.log("value successfully written in store put: ", value);
      callback(null, value);
    });
  } catch (error) {
    callback(error, null);
  }
}

function get(configuration, callback) {
  try {
    console.log("in local store get: ", configuration);
    // If configuration is null, return all keys from local group
    if (configuration === null) {
      const localDir = getGroupDir('local');
      fs.readdir(localDir, (err, files) => {
        if (err) {
          callback(err, null);
          return;
        }
        const keys = files.map(file => file.replace(/_/g, ''));
        callback(null, keys);
      });
      return;
    }

    // Handle both string and object configurations
    const gid = typeof configuration === 'object' ? configuration.gid : 'local';
    const key = typeof configuration === 'object' ? configuration.key : configuration;

    // If key is null, return all keys from specified group
    if (key === null) {
      const groupDir = getGroupDir(gid);
      fs.readdir(groupDir, (err, files) => {
        if (err) {
          callback(err, null);
          return;
        }
        const keys = files.map(file => file.replace(/_/g, ''));
        callback(null, keys);
      });
      return;
    }
    
    const filePath = getFilePath(gid, key);
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          callback(new Error(`Key not found in group ${gid}`), null);
        } else {
          callback(err, null);
        }
        return;
      }

      try {
        const value = util.deserialize(data);
        callback(null, value);
      } catch (error) {
        callback(error, null);
      }
    });
  } catch (error) {
    callback(error, null);
  }
}

function del(configuration, callback) {
  try {
    const gid = typeof configuration === 'object' ? configuration.gid : 'local';
    const key = typeof configuration === 'object' ? configuration.key : configuration;

    const filePath = getFilePath(gid, key);
    
    // First read the file to return its value
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          callback(new Error(`Key not found in group ${gid}`), null);
        } else {
          callback(err, null);
        }
        return;
      }

      // Then delete the file
      fs.unlink(filePath, (err) => {
        if (err) {
          callback(err, null);
          return;
        }
        try {
          const value = util.deserialize(data);
          callback(null, value);
        } catch (error) {
          callback(error, null);
        }
      });
    });
  } catch (error) {
    callback(error, null);
  }
}

module.exports = {put, get, del};
