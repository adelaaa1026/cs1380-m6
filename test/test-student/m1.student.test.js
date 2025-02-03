/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');

test('(1 pts) student test', () => {
  //   test: 'm1: sample test'
  const object = {milestone: 'm1', status: 'complete'};
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);

  expect(deserialized).toEqual(object);
});

test('(1 pts) student test', () => {
  //   test: 'm1: basic structure - number'
  const object = 1380
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object); 
});

test('(1 pts) student test', () => {
  //   test: 'm1: basic structure - string'
  const object = "CS1380"
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object);  
});

test('(1 pts) student test', () => {
  //   test: 'm1: basic structure - boolean'
  const object = false
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object);  
});

test('(1 pts) student test', () => {
  //   test: 'm1: basic structure - null'
  const object = null
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized)
  expect(deserialized).toEqual(object); 
});

test('(1 pts) student test', () => {
  //   test: arrow function
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

test('(1 pts) student test', () => {
  //   test: regular function with parameter
  const add = function(a, b) { return a + b; };
  let serialized = distribution.util.serialize(add);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized(0, 1)).toBe(1);
});

test('(1 pts) student test', () => {
  //   test: regular function without parameter
  const func = function() { return 1380; };
  let serialized = distribution.util.serialize(func);
  let deserialized = distribution.util.deserialize(serialized);
  expect(deserialized()).toBe(1380);
  
});

test('(1 pts) student test', () => {
  //   test: array
  const object = [1380, "cs1380", null, [1380, 1380]];
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);
  expect(deserialized).toEqual(object);
});

test('(1 pts) student test', () => {
  //   test: object
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

test('(1 pts) student test', () => {
  //   test: date
  const object = new Date('2024-03-14T12:00:00Z');
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);
  
  expect(deserialized instanceof Date).toBe(true);
  expect(deserialized.getTime()).toBe(object.getTime());
});

test('(1 pts) student test', () => {
  //   test: error
  const object = new Error('CS1380 lalala');
  const serialized = distribution.util.serialize(object);
  const deserialized = distribution.util.deserialize(serialized);
  
  expect(deserialized instanceof Error).toBe(true);
  expect(deserialized.message).toBe('CS1380 lalala');
  expect(deserialized.name).toBe('Error');
  expect(deserialized.stack).toBeDefined();
});

test('(1 pts) student test', () => {
  // test: nested objects and arrays
  const obj = {
    1: {
      2: {
        3: [1, 2, { 1380: 'cs1380' }]
      }
    }
  };
  const serialized = distribution.util.serialize(obj);
  const deserialized = distribution.util.deserialize(serialized);

  expect(deserialized).toEqual(obj);
});

test('(1 pts) student test', () => {
  // test: cycle
  const obj = {};
  obj.self = obj; 
  const serialized = distribution.util.serialize(obj);
  const deserialized = distribution.util.deserialize(serialized);

  expect(deserialized.self).toBe(deserialized);  
});

test('(1 pts) student test', () => {
  // test: infinity, negative infinity, and NaN
  const obj = {
    positiveInfinity: Infinity,
    negativeInfinity: -Infinity,
    notANumber: NaN
  };
  const serialized = distribution.util.serialize(obj);
  const deserialized = distribution.util.deserialize(serialized);

  expect(deserialized.positiveInfinity).toBe(Infinity);
  expect(deserialized.negativeInfinity).toBe(-Infinity);
  expect(Number.isNaN(deserialized.notANumber)).toBe(true);
});

test('(1 pts) student test', () => {
  // test: empty structures
  const obj = {
    emptyObject: {},
    emptyArray: []
  };
  const serialized = distribution.util.serialize(obj);
  const deserialized = distribution.util.deserialize(serialized);

  expect(deserialized).toEqual(obj);
});
