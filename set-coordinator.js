const fs = require('fs');

// Get the public DNS name from command line
const publicDns = process.argv[2];
const port = process.argv[3] || 8000;

if (!publicDns) {
  console.error("Please provide your public DNS name: node set-coordinator.js <public-dns> [port]");
  process.exit(1);
}

// Create a coordinator config file
const config = {
  ip: publicDns,
  port: parseInt(port)
};

// Save to a file that will be loaded by your tests
fs.writeFileSync('coordinator-config.json', JSON.stringify(config, null, 2));
console.log(`Coordinator set to ${publicDns}:${port}`);