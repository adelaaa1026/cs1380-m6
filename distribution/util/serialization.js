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

// Get native objects using process.binding
const NATIVE_MODULES = Object.keys(process.binding('natives'))
    .filter(name => !name.startsWith('internal/'));

// Add list of built-in constructors
const BUILT_INS = [
    Object, Array, Function, String, Number, Boolean, Date, RegExp, Error,
    Map, Set, WeakMap, WeakSet, Promise, BigInt, Symbol
];

/**
 * Serializes a JavaScript value into a JSON string, handling cycles.
 */
function serialize(object) {
    // Map to track objects and their IDs
    const seen = new Map();
    let nextId = 0;

    function getUEID(obj) {
        if (!seen.has(obj)) {
            seen.set(obj, nextId++);
        }
        return seen.get(obj);
    }

    function serializeWithCycles(obj) {
        if (obj === null) {
            return { type: "null", value: "null" };
        }
        if (obj === undefined) {
            return { type: "undefined", value: "undefined" };
        }

        // If we've seen this object before, return a reference
        if (seen.has(obj)) {
            return {
                type: "reference",
                value: seen.get(obj)
            };
        }

        // Check for built-in constructors and their prototypes
        const builtInIndex = BUILT_INS.indexOf(obj);
        if (builtInIndex !== -1) {
            return {
                type: "built-in",
                value: BUILT_INS[builtInIndex].name
            };
        }

        // Check for built-in prototypes
        for (const builtin of BUILT_INS) {
            if (obj === builtin.prototype) {
                return {
                    type: "built-in-prototype",
                    value: builtin.name
                };
            }
        }

        // Check for console methods
        if (typeof obj === 'function' && console && Object.values(console).includes(obj)) {
            const methodName = Object.entries(console)
                .find(([_, func]) => func === obj)[0];
            return {
                type: "native",
                module: "console",
                export: methodName
            };
        }

        // Check for native modules and their exports
        for (const name of NATIVE_MODULES) {
            try {
                const nativeModule = require(name);
                // Check if obj is the module itself or one of its exports
                if (obj === nativeModule || 
                    (typeof nativeModule === 'object' && 
                     Object.values(nativeModule).includes(obj))) {
                    return {
                        type: "native",
                        module: name,
                        export: obj === nativeModule ? null : 
                               Object.entries(nativeModule)
                                     .find(([_, val]) => val === obj)?.[0]
                    };
                }
            } catch (e) {
                continue;
            }
        }

        // Handle primitive types directly
        if (typeof obj !== 'object' && typeof obj !== 'function') {
            return {
                type: typeof obj,
                value: obj.toString()
            };
        }

        // Generate UEID for new object
        const id = getUEID(obj);

        if (obj instanceof Date) {
            return {
                type: "date",
                id: id,
                value: obj.toISOString()
            };
        }

        if (obj instanceof Error) {
            return {
                type: "error",
                id: id,
                value: {
                    name: obj.name,
                    message: obj.message,
                    stack: obj.stack
                }
            };
        }

        if (Array.isArray(obj)) {
            return {
                type: "array",
                id: id,
                value: obj.map(item => serializeWithCycles(item))
            };
        }

        if (typeof obj === "object") {
            const serializedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    serializedObj[key] = serializeWithCycles(obj[key]);
                }
            }
            return {
                type: "object",
                id: id,
                value: serializedObj
            };
        }

        // Add function handling
        if (typeof obj === "function") {
            const funcStr = obj.toString();
            return {
                type: "function",
                id: id,
                value: funcStr
            };
        }

        return {
            type: typeof obj,
            id: id,
            value: obj.toString()
        };
    }

    return JSON.stringify(serializeWithCycles(object));
}

/**
 * Deserializes a JSON string back into its original JavaScript value, handling cycles.
 */
function deserialize(string) {
    const objectsById = new Map();

    function deserializeWithCycles(node) {
        const { type, value, id, module, export: exportName } = node;

        if (type === "reference") {
            return objectsById.get(value);
        }

        let result;

        switch (type) {
            case "built-in":
                return global[value];
            
            case "built-in-prototype":
                return global[value].prototype;

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
            case "function": {
                // Skip trying to evaluate native code
                if (value.includes('[native code]')) {
                    return function() { 
                        throw new Error('Cannot execute native code');
                    };
                }
                result = new Function('return ' + value)();
                if (id !== undefined) {
                    objectsById.set(id, result);
                }
                return result;
            }
            case "native": {
                if (module === "console") {
                    return console[exportName];
                }
                const nativeModule = require(module);
                return exportName ? nativeModule[exportName] : nativeModule;
            }
            case "date":
                result = new Date(value);
                break;
            case "error": {
                result = new Error(value.message);
                result.name = value.name;
                result.stack = value.stack;
                break;
            }
            case "array":
                result = [];
                if (id !== undefined) {
                    objectsById.set(id, result);
                }
                value.forEach((item, index) => {
                    result[index] = deserializeWithCycles(item);
                });
                break;
            case "object":
                result = {};
                if (id !== undefined) {
                    objectsById.set(id, result);
                }
                for (const key in value) {
                    if (value.hasOwnProperty(key)) {
                        result[key] = deserializeWithCycles(value[key]);
                    }
                }
                break;
            default:
                throw new Error("Unsupported type");
        }

        return result;
    }

    return deserializeWithCycles(JSON.parse(string));
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
