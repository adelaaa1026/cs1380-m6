const distribution = require('./distribution.js');
const os = require('os');

// Get the public IP from command line or environment
const publicIp = process.argv[2] || process.env.PUBLIC_IP;

if (!publicIp) {
  console.error("Please provide the public IP as an argument: node run-node.js <public-ip>");
  process.exit(1);
}

// Set the global coordinator node
global.coordinatorNode = {
  ip: publicIp,
  port: global.nodeConfig.port
};

console.log("Starting node with coordinator:", global.coordinatorNode);
distribution.node.start(); 