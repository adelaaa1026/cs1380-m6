const log = require('../util/log');

const wire = {
  // Implement the necessary functions here
  // For example:
  encode: function(data) {
    return JSON.stringify(data);
  },
  decode: function(data) {
    return JSON.parse(data);
  }
  // Add other functions as needed
};

/*
  The toAsync function transforms a synchronous function that returns a value into an asynchronous one,
  which accepts a callback as its final argument and passes the value to the callback.
*/
function toAsync(func) {
  log(`Converting function to async: ${func.name}: ${func.toString().replace(/\n/g, '|')}`);

  // It's the caller's responsibility to provide a callback
  const asyncFunc = (...args) => {
    const callback = args.pop();
    try {
      const result = func(...args);
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  };

  /* Overwrite toString to return the original function's code.
   Otherwise, all functions passed through toAsync would have the same id. */
  asyncFunc.toString = () => func.toString();
  return asyncFunc;
}

module.exports = {
  createRPC: wire.createRPC,
  toAsync: toAsync,
};
