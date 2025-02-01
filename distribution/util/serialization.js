/*
    Checklist:

    1. Serialize strings
    2. Serialize numbers
    3. Serialize booleans
    4. Serialize (non-circular) Objects
    5. Serialize (non-circular) Arrays
    6. Serialize undefined and null
    7. Serialize Date, Error objects
    8. Serialize (non-native) functions
    9. Serialize circular objects and arrays
    10. Serialize native functions
*/


function serialize(object) {
  if (object === null) {
      return JSON.stringify({ type: "null", value: "null" });
  }
  if (object === undefined) {
      return JSON.stringify({ type: "undefined", value: "undefined" });
  }

    if (Array.isArray(object)) {
        return JSON.stringify({
            type: "array",
            value: object.map(item => serialize(item))
        });
    }

    if (object instanceof Date) {
        return JSON.stringify({
            type: "date",
            value: object.toISOString()
        });
    }

    //   if (typeof object === "function") {
//     return JSON.stringify({
//         type: "function",
//         value: object.toJSON() // Use the toJSON method for functions
//     });
// } 

    if (typeof object === "object") {
        const sObject = {};
        for (const key in object) {
            if (object.hasOwnProperty(key)) {
                sObject[key] = serialize(object[key]);
            }
        }
        return JSON.stringify({
            type: "object",
            value: sObject
        });
    }

  const type = typeof object;
  

  return JSON.stringify({
      type: type,
      value: object.toString()
  });
}


function deserialize(string) {
  const { type, value } = JSON.parse(string);
  switch (type) {
      case "null":
          return null;
      case "undefined":
          return undefined;
      case "string":
          return value;
      case "number":
          return Number(value);
      case "boolean":
          return value === "true";
      case "function":
          return new Function('return ' + value)()
      // case "function":
      //   return Function.deserialise(null, value); 
      case "array":
          return value.map(item => deserialize(item));
          case "object": {
            const obj = {};
            for (const key in value) {
                if (value.hasOwnProperty(key)) {
                    obj[key] = deserialize(value[key]);
                }
            }
            return obj;
        }
        case "date":
            return new Date(value);
      default:
          throw new Error("Unsupported type");
  }
  
}


// // Attach serialization method to Function prototype
// Function.prototype.toJSON = function () {
//   var parts = this.toString().match(/^\s*function[^(]*\(([^)]*)\)\s*{([\s\S]*)}\s*$/);
//   if (!parts) throw new Error('Function form not supported');

//   return [
//       'window.Function',
//       parts[1].trim().split(/\s*,\s*/).filter(Boolean), // Handle empty argument lists properly
//       parts[2].trim()
//   ];
// };

// // Attach deserialization method to Function object
// Function.deserialise = function (key, data) {
//   return (Array.isArray(data) && data[0] === 'window.Function')
//       ? new (Function.bind.apply(Function, [Function].concat(data[1], [data[2]])))
//       : data;
// };

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
