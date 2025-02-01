/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
*/

const distribution = require('../config.js');

// M1 Test Cases
 
test('m1: sample test', () => {
  const object = {milestone: 'm1', status: 'complete'};
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);

  expect(deserialized).toEqual(object);
});

// test basic structures: number, string, boolean, null
test('m1: basic structure - number', () => {
  const object = 1380
  const serialized = distribution.util.serialize(object); // expected_setialized = '{"type":"number","value":"1380"}';
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object); 
})

test('m1: basic structure - string', () => {
  const object = "CS1380"
  const serialized = distribution.util.serialize(object); // expected_setialized = '{"type":"string","value":"CS1380"}'
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object);  
})

test('m1: basic structure - number', () => {
  const object = false
  const serialized = distribution.util.serialize(object); // expected_setialized = '{"type":"boolean","value":"false"}'
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object);  
})

test('m1: basic structure - null', () => {
  const object = null
  const serialized = distribution.util.serialize(object); // expected_setialized = '{"type":"null","value":"null"}'
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object); 
})

test('m1: basic structure - undefined', () => {
  const object = undefined
  const serialized = distribution.util.serialize(object); // expected_setialized = '{"type":"undefined","value":"undefined"}'
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object); 
})

test('m1: arrow function', () => {
  // let func = (a, b) => a + b;
  let add = (a,b) => {
    alert('native function');
    return a + b;
  }
  console.log("function to string: ", add.toString())
  const serialized = distribution.util.serialize(add);  
  const deserialized = distribution.util.deserialize(serialized)
  console.log("serialized function: ", serialized)
  console.log("deserialized function: ", deserialized)
  // expect(deserialized).toEqual(func); 
  expect(deserialized.toString()).toEqual(add.toString());
})

test('m1: regular functions', () => {
  const add = function(a, b) { return a + b; };
  let serialized = distribution.util.serialize(add);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized(0, 1)).toBe(1);
});

test('m1: regular function without parameter', () => {
  // Regular function without params
  const func = function() { return 1380; };
  let serialized = distribution.util.serialize(func);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized()).toBe(1380);
  
});

test('m1: array', () => {
  const object = [1380, "cs1380", null, [1380, 1380]];
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(object);
});

test('m1: object', () => {
  const object = {
    num: 1380,
    str: "1380",
    null: null,
    arr: [1380, 1380],
    obj: {
      a: 1380,
      b: "cs1380"
    }
  };
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(object);
});

test('m1: date', () => {
  const object = new Date('2024-03-14T12:00:00Z');
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);
  
  expect(deserialized instanceof Date).toBe(true);
  expect(deserialized.getTime()).toBe(object.getTime());
});

test('m1: error', () => {
  const object = new Error('CS1380 lalala');
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);
  
  expect(deserialized instanceof Error).toBe(true);
  expect(deserialized.message).toBe('CS1380 lalala');
  expect(deserialized.name).toBe('Error');
  expect(deserialized.stack).toBeDefined();
});

test('debug native modules serialization', () => {
    // Get fs.readFile specifically
    const readFile = require('fs').readFile;
    
    console.log('Original readFile:', readFile.toString());
    
    const serialized = distribution.util.serialize(readFile);
    console.log('Serialized:', serialized);
    
    const deserialized = distribution.util.deserialize(serialized);
    console.log('Deserialized:', deserialized.toString());
    
    // Test the actual values
    expect(typeof deserialized).toBe('function');
    console.log('Are they equal?', readFile === deserialized);
    console.log('Original type:', typeof readFile);
    console.log('Deserialized type:', typeof deserialized);
    
    // Test if it's actually a native function
    console.log('Is native function?', readFile.toString().includes('[native code]'));
    
    // Compare the actual functions
    expect(deserialized).toBe(readFile);
});

test('debug console.log serialization', () => {
    const originalLog = console.log;
    
    console.log('Original log function:', originalLog.toString());
    console.log('Is native?', originalLog.toString().includes('[native code]'));
    
    const serialized = distribution.util.serialize(originalLog);
    console.log('Serialized:', serialized);
    
    const deserialized = distribution.util.deserialize(serialized);
    console.log('Deserialized:', deserialized.toString());
    
    // Compare functions
    console.log('Are equal?', originalLog === deserialized);
    console.log('Original name:', originalLog.name);
    console.log('Deserialized name:', deserialized.name);
    
    // Test actual values
    expect(deserialized).toBe(originalLog);
});

test('debug built-in constructors serialization', () => {
    const constructors = [Object, Array, Object.prototype];
    
    console.log('Original Object:', Object.toString());
    console.log('Is Object native?', Object.toString().includes('[native code]'));
    console.log('Object name:', Object.name);
    
    const serialized = distribution.util.serialize(constructors);
    console.log('Serialized:', serialized);
    
    const deserialized = distribution.util.deserialize(serialized);
    console.log('Deserialized Object:', deserialized[0].toString());
    console.log('Deserialized Object name:', deserialized[0].name);
    console.log('Are equal?', Object === deserialized[0]);
    
    // Test actual values
    expect(deserialized[0]).toBe(Object);
    expect(deserialized[1]).toBe(Array);
    expect(deserialized[2]).toBe(Object.prototype);
});

// M2 Test Cases

// M3 Test Cases

// M4 Test Cases

// M5 Test Cases
