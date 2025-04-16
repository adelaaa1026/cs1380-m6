jest.setTimeout(30000); // 30 seconds timeout for all tests in this file

const distribution = require('../config.js');
const id = distribution.util.id;

// Define the groups
const storageGroup = {};
const indexerGroup = {};

// Define the nodes
// const n1 = {ip: '127.0.0.1', port: 8001};
// const n2 = {ip: '127.0.0.1', port: 8002};
// const n3 = {ip: '127.0.0.1', port: 8003};
// const n4 = {ip: '127.0.0.1', port: 8004};
const n1 = {ip: 'ec2-xx-xx-xx-xx.compute-1.amazonaws.com', port: 8001};
const n2 = {ip: 'ec2-xx-xx-xx-xx.compute-1.amazonaws.com', port: 8002};
const n3 = {ip: 'ec2-xx-xx-xx-xx.compute-1.amazonaws.com', port: 8003};
const n4 = {ip: 'ec2-xx-xx-xx-xx.compute-1.amazonaws.com', port: 8004};

// Local server for orchestration
let localServer = null;

test('(10 pts) (scenario) all.mr:tfidf', (done) => {
  // Sample repository data
  const repositories = [
    {
      repo_id: "repo1",
      readme: "This is a JavaScript library for machine learning applications.",
      repo_name: "ML-JS-Library",
      author: "techdev",
      topics: ["machine-learning", "javascript", "library"],
      language: "JavaScript",
      stargazers_count: 120,
      forks_count: 35
    },
    {
      repo_id: "repo2",
      readme: "JavaScript A Python framework for data analysis and visualization. and and and",
      repo_name: "DataViz-Framework",
      author: "datawhiz",
      topics: ["data-analysis", "visualization", "python"],
      language: "Python",
      stargazers_count: 250,
      forks_count: 78
    },
    {
      repo_id: "repo3",
      readme: "Rust implementation of common algorithms and data structures. and",
      repo_name: "Rust-Algorithms",
      author: "rustdev",
      topics: ["algorithms", "data-structures", "rust"],
      language: "Rust",
      stargazers_count: 180,
      forks_count: 42
    },
    {
      repo_id: "repo4",
      readme: "Rust Rust JavaScript utilities for web development and DOM manipulation.",
      repo_name: "JS-Utils",
      author: "webdev",
      topics: ["javascript", "utilities", "web-development"],
      language: "JavaScript",
      stargazers_count: 310,
      forks_count: 95
    }
  ];

  // TF-IDF Mapper function
  const mapper = (key, repo) => {
    
    // Extract all words from relevant fields
    const extractWords = (text) => {
      if (!text) return [];
      if (Array.isArray(text)) {
        return text.join(' ').toLowerCase().split(/\W+/).filter(word => word.length > 1);
      }
      return text.toLowerCase().split(/\W+/).filter(word => word.length > 1);
    };

    // Get words from different fields
    const readmeWords = extractWords(repo.readme);
    const repoNameWords = extractWords(repo.repo_name);
    const authorWords = extractWords(repo.author);
    const topicsWords = extractWords(repo.topics);
    const languageWords = extractWords(repo.language);

    // Count word frequencies in readme (term frequency)
    const wordFrequency = {};
    readmeWords.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Create result array
    const result = [];
    
    // Process all unique words
    const allWords = new Set([
      ...readmeWords,
      ...repoNameWords,
      ...authorWords,
      ...topicsWords,
      ...languageWords
    ]);
    
    allWords.forEach(word => {
      // Calculate weight based on where the word appears
      let weight = 1;
      
      // Apply weight multipliers
      if (languageWords.includes(word)) weight *= 10;
      if (repoNameWords.includes(word)) weight *= 10;
      if (authorWords.includes(word)) weight *= 10;
      if (topicsWords.includes(word)) weight *= 10;
      
      const termFrequency = wordFrequency[word] || 0;
      
      // Create output object for this word
      const output = {};
      output[word] = {
        repo_id: repo.repo_id,
        repo_name: repo.repo_name,
        term_frequency: termFrequency,
        weight: weight,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count
      };
      
      result.push(output);
    });
    
    return result;
  };

  // TF-IDF Reducer function
  const reducer = (word, repoMetadata) => {
    // Calculate inverse document frequency (IDF)
    // const totalDocuments = repositories.length;
    const totalDocuments = 4;
    const documentsWithWord = repoMetadata.length;
    const idf = Math.log(totalDocuments / documentsWithWord);
    
    // Calculate total weight for each repo
    const reposWithWeights = repoMetadata.map(repo => {
      return {
        repo_id: repo.repo_id,
        repo_name: repo.repo_name,
        idf: idf,
        weight: repo.weight,
        total_weight: idf * repo.weight,
        term_frequency: repo.term_frequency,
      };
    });
    
    // Sort by total weight in descending order
    reposWithWeights.sort((a, b) => b.total_weight - a.total_weight);
    
    // Return the result
    const result = {};
    result[word] = reposWithWeights;
    return result;
  };

  // Store repositories in the storage group
  const storeRepositories = (callback) => {
    let stored = 0;
    
    repositories.forEach(repo => {
      distribution.indexer.store.put(repo, repo.repo_id, (err, result) => {
        if (err  && Object.keys(err).length > 0) {
          console.error("Error storing repository:", err);
        } else {
          console.log(`Repository ${repo.repo_id} stored successfully`);
        }
        
        stored++;
        if (stored === repositories.length) {
          callback();
        }
      });
    });
  };

  // Run the MapReduce job
  const runMapReduce = () => {
    // Get all repository keys from storage
    distribution.indexer.store.get(null, (err, keys) => {
      console.log("err:", err);
      console.log("Keys:", keys);
      if (err  && Object.keys(err).length > 0) {
        console.error("Error getting repository keys:", err);
        done(err);
        return;
      }
      
      console.log("Retrieved repository keys:", keys);
      
      // Execute MapReduce
      distribution.indexer.mr.exec({
        keys: keys,
        map: mapper,
        reduce: reducer
      }, (err, results) => {
        if (err  && Object.keys(err).length > 0) {
          console.error("Error in MapReduce execution:", err);
          done(err);
          return;
        }
        
        console.log("MapReduce results:", JSON.stringify(results, null, 2));
        
        // Verify results
        try {
          // Check that we have results
          expect(results).toBeDefined();
          expect(results.length).toBeGreaterThan(0);
          
          // Check structure of results
          results.forEach(result => {
            const word = Object.keys(result)[0];
            const repos = result[word];
            
            expect(word).toBeDefined();
            expect(repos).toBeInstanceOf(Array);
            
            // if (repos.length > 1) {
            //   // Check that repos are sorted by total_weight in descending order
            //   for (let i = 0; i < repos.length - 1; i++) {
            //     expect(repos[i].total_weight).toBeGreaterThanOrEqual(repos[i+1].total_weight);
            //   }
            // }
            
            // Check repo structure
            repos.forEach(repo => {
              expect(repo.repo_id).toBeDefined();
              expect(repo.repo_name).toBeDefined();
              expect(repo.total_weight).toBeDefined();
            });
          });
          
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  };

  // Start the process
  storeRepositories(() => {
    console.log("All repositories stored, starting MapReduce");
    runMapReduce();
  });
}, 25000);

/*
 * Setup and teardown code
 */
beforeAll((done) => {
  // Setup storage and indexer groups
  storageGroup[id.getSID(n1)] = n1;
  storageGroup[id.getSID(n2)] = n2;
  
  indexerGroup[id.getSID(n3)] = n3;
  indexerGroup[id.getSID(n4)] = n4;

  // Start the local node
  distribution.node.start((server) => {
    localServer = server;
    
    // Get the actual address and port
    const actualAddress = server.address();
    const coordinatorNode = {
      ip: actualAddress.address === '::' ? '127.0.0.1' : actualAddress.address,
      port: actualAddress.port
    };
    
    console.log("Using coordinator:", coordinatorNode);
    
    // Spawn all nodes
    const startNodes = () => {
      distribution.local.status.spawn(n1, (e, v) => {
        distribution.local.status.spawn(n2, (e, v) => {
          distribution.local.status.spawn(n3, (e, v) => {
            distribution.local.status.spawn(n4, (e, v) => {
              setupGroups();
            });
          });
        });
      });
    };
    
    // Setup the groups
    const setupGroups = () => {
      const storageConfig = {gid: 'storage'};
      const indexerConfig = {gid: 'indexer'};
      
      // Create the groups
      distribution.local.groups.put(storageConfig, storageGroup, (e, v) => {
        distribution.storage.groups.put(storageConfig, storageGroup, (e, v) => {
          distribution.local.groups.put(indexerConfig, indexerGroup, (e, v) => {
            distribution.indexer.groups.put(indexerConfig, indexerGroup, (e, v) => {
              done();
            });
          });
        });
      });
    };
    
    // Start the process
    startNodes();
  });
});

afterAll((done) => {
  // Stop all nodes
  const remote = {service: 'status', method: 'stop'};
  
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          localServer.close();
          done();
        });
      });
    });
  });
}); 