/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

// Create groups for the tests
const wordCountGroup = {};
const textAnalysisGroup = {};

// Define nodes for testing
const n1 = {ip: '127.0.0.1', port: 8110};
const n2 = {ip: '127.0.0.1', port: 8111};
const n3 = {ip: '127.0.0.1', port: 8112};

let localServer = null;


test('(1 pts) student test', (done) => {
  // Word count MapReduce test using a different group
  
  // Map function: Split text into words and count each word
  const mapper = (key, value) => {
    console.log("mapper is now", key, value);
    const words = value.match(/\b\w+\b/g) || [];
    const results = [];
    
    // Emit each word with count 1
    words.forEach(word => {
      results.push({ [word]: 1 });
    });
    
    return results;
  };
  
  // Reduce function: Sum up counts for each word
  const reducer = (key, values) => {
    console.log("reducer is now", key, values);
    const count = values.reduce((sum, value) => sum + value, 0);
    console.log("reducer result is now", { [key]: count });
    return { [key]: count };
  };
  
  // Test dataset
  const dataset = [
    {'doc1': 'Brown CS department is great'},
    {'doc2': 'Brown is a great university'},
    {'doc3': 'I love Brown'}
  ];
  
  // Expected results
  const expected = [
    {'Brown': 3},
    {'CS': 1},
    {'department': 1},
    {'is': 2},
    {'great': 2},
    {'university': 1},
    {'I': 1},
    {'love': 1},
    {'a': 1}
  ];
  
  // Function to run MapReduce after data is loaded
  const runMapReduce = () => {
    distribution.textanalysis.store.get(null, (err, keys) => {
      
      expect(keys.length).toBe(dataset.length);
      
      distribution.textanalysis.mr.exec({
        keys: keys,
        map: mapper,
        reduce: reducer
      }, (err, results) => {
        
        try {
          expect(results).toEqual(expect.arrayContaining(expected));
          
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  };
  
  // Setup and load data
  let loadedCount = 0;
  
  dataset.forEach(item => {
    const key = Object.keys(item)[0];
    const value = item[key];
    
    distribution.textanalysis.store.put(value, key, (err) => {
      
      loadedCount++;
      if (loadedCount === dataset.length) {
        runMapReduce();
      }
    });
  });
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});

test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});

test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});

// Setup code for the tests
beforeAll((done) => {
  // Register nodes in the groups
  wordCountGroup[id.getSID(n1)] = n1;
  wordCountGroup[id.getSID(n2)] = n2;
  wordCountGroup[id.getSID(n3)] = n3;
  
  textAnalysisGroup[id.getSID(n1)] = n1;
  textAnalysisGroup[id.getSID(n2)] = n2;
  textAnalysisGroup[id.getSID(n3)] = n3;
  
  // Start the nodes
  const startNodes = (callback) => {
    distribution.local.status.spawn(n1, () => {
      distribution.local.status.spawn(n2, () => {
        distribution.local.status.spawn(n3, () => {
          callback();
        });
      });
    });
  };
  
  // Start the local server and set up the groups
  distribution.node.start((server) => {
    localServer = server;
    
    const wordcountConfig = {gid: 'wordcount'};
    const textanalysisConfig = {gid: 'textanalysis'};
    
    startNodes(() => {
      distribution.local.groups.put(wordcountConfig, wordCountGroup, () => {
        distribution.wordcount.groups.put(wordcountConfig, wordCountGroup, () => {
          distribution.local.groups.put(textanalysisConfig, textAnalysisGroup, () => {
            distribution.textanalysis.groups.put(textanalysisConfig, textAnalysisGroup, () => {
              done();
            });
          });
        });
      });
    });
  });
});

// Cleanup after tests
afterAll((done) => {
  // Stop all nodes
  const remote = {service: 'status', method: 'stop'};
  
  remote.node = n1;
  distribution.local.comm.send([], remote, () => {
    remote.node = n2;
    distribution.local.comm.send([], remote, () => {
      remote.node = n3;
      distribution.local.comm.send([], remote, () => {
        if (localServer) {
          localServer.close();
        }
        done();
      });
    });
  });
});
