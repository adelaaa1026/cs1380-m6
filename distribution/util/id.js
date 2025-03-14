/** @typedef {import("../types.js").Node} Node */

const assert = require('assert');
const crypto = require('crypto');

// The ID is the SHA256 hash of the JSON representation of the object
/** @typedef {!string} ID */

/**
 * @param {any} obj
 * @return {ID}
 */
function getID(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}

/**
 * The NID is the SHA256 hash of the JSON representation of the node
 * @param {Node} node
 * @return {ID}
 */
function getNID(node) {
  node = {ip: node.ip, port: node.port};
  return getID(node);
}

/**
 * The SID is the first 5 characters of the NID
 * @param {Node} node
 * @return {ID}
 */
function getSID(node) {
  return getNID(node).substring(0, 5);
}


function getMID(message) {
  const msg = {};
  msg.date = new Date().getTime();
  msg.mss = message;
  return getID(msg);
}

function idToNum(id) {
  const n = parseInt(id, 16);
  assert(!isNaN(n), 'idToNum: id is not in KID form!');
  return n;
}

function naiveHash(kid, nids) {
  nids.sort();
  return nids[idToNum(kid) % nids.length];
}

// Convert a string to a numerical representation using a hash function
function hashToNumber(str) {
  return parseInt(crypto.createHash('sha256').update(str).digest('hex'), 16);
}

function consistentHash(kid, nids) {
  const ring = nids.map(nid => ({ nid, hash: getID(nid) }));
  const kidHash = getID(kid);
  // console.log("kidHash: ", kidHash);
  // console.log(" ring: ", ring);
 
  ring.sort((a, b) => a.hash.localeCompare(b.hash));
  // console.log("sorted ring: ", ring);
 
  
  for (let i = 0; i < ring.length; i++) {
    if (ring[i].hash.localeCompare(kidHash) < 0) { // smaller or larger?
      console.log("ring[i].nid: ", ring[i].nid);
      return ring[i].nid;
    }
  }
  // console.log("ring[0].nid: ", ring[0].nid);

  return ring[0].nid;
}

function rendezvousHash(kid, nids) {
  let maxHash = -1;
  let selectedNid = null;

  nids.forEach(nid => {
    const combined = kid + nid;
    const hashValue = hashToNumber(combined);

    if (hashValue > maxHash) {
      maxHash = hashValue;
      selectedNid = nid;
    }
  });

  return selectedNid;
}

module.exports = {
  getID,
  getNID,
  getSID,
  getMID,
  naiveHash,
  consistentHash,
  rendezvousHash,
};
