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


// M2 Test Cases

// M3 Test Cases

// M4 Test Cases

// M5 Test Cases
