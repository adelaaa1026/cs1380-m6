const fetch = require("node-fetch");
if (typeof global.fetch === "undefined") {
  global.fetch = fetch;
}
