/*
    Distributed Search Engine Implementation
    This test demonstrates a complete search engine with crawler, indexer, and query components
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

// Create groups for each component
const crawlerGroup = {};
const indexerGroup = {};
const queryGroup = {};

// Define nodes for testing
const n1 = {ip: '127.0.0.1', port: 9110};
const n2 = {ip: '127.0.0.1', port: 9111};
const n3 = {ip: '127.0.0.1', port: 9112};

let localServer = null;

test('(1 pts) student test', (done) => {
  // Web Crawler Component
  
  // Map function: Download content from URLs
  const mapper = (key, url) => {
    // Mock HTTP request function (in a real implementation, this would use fetch or http.get)
    const mockFetch = (url) => {
      // Simulate different content based on URL
      if (url.includes('example.com')) {
        return 'This is the Example.com homepage with links to <a href="https://example.com/about">About</a> and <a href="https://example.com/contact">Contact</a>';
      } else if (url.includes('example.com/about')) {
        return 'About Example.com - Learn more about our company and <a href="https://example.com/team">our team</a>';
      } else if (url.includes('example.com/contact')) {
        return 'Contact Example.com - Reach out to us at contact@example.com';
      } else if (url.includes('example.org')) {
        return 'Example.org is a different site with <a href="https://example.org/resources">resources</a>';
      } else {
        return `Content from ${url}`;
      }
    };

    try {
      // "Download" the content
      const content = mockFetch(url);
      
      // Extract metadata
      const timestamp = new Date().toISOString();
      const size = content.length;
      
      // Return the content and metadata
      return [{ 
        [url]: {
          content: content,
          metadata: {
            crawled_at: timestamp,
            size: size,
            status: 'success'
          }
        }
      }];
    } catch (error) {
      // Handle errors
      return [{ 
        [url]: {
          content: null,
          metadata: {
            crawled_at: new Date().toISOString(),
            error: error.message,
            status: 'failed'
          }
        }
      }];
    }
  };

  // Reduce function: Aggregate statistics about crawled pages
  const reducer = (key, values) => {
    // In this case, we're just passing through the crawled data
    const result = {};
    
    // For each URL, collect statistics
    values.forEach(value => {
      const url = key;
      const metadata = value.metadata;
      
      if (!result[url]) {
        result[url] = {
          content: value.content,
          status: metadata.status,
          size: metadata.size || 0,
          crawled_at: metadata.crawled_at
        };
      }
    });
    
    return { [key]: result[key] };
  };

  // Test dataset: URLs to crawl
  const dataset = [
    {'url1': 'https://example.com'},
    {'url2': 'https://example.com/about'},
    {'url3': 'https://example.com/contact'},
    {'url4': 'https://example.org'}
  ];

  // Expected results after MapReduce
  const expected = [
    {'https://example.com': {
      status: 'success',
      size: expect.any(Number),
      crawled_at: expect.any(String),
      content: expect.stringContaining('Example.com homepage')
    }}
  ];

  // Function to run MapReduce after data is loaded
  const runMapReduce = () => {
    distribution.crawler.store.get(null, (err, keys) => {
      expect(keys.length).toBe(dataset.length);
      
      distribution.crawler.mr.exec({
        keys: keys,
        map: mapper,
        reduce: reducer
      }, (err, results) => {
        try {
          // Check that we have results
          expect(results.length).toBeGreaterThan(0);
          
          // Check that the first URL was crawled successfully
          const firstResult = results.find(r => Object.keys(r)[0] === 'https://example.com');
          expect(firstResult).toBeDefined();
          expect(firstResult['https://example.com'].status).toBe('success');
          
          // Store the crawled data for the indexer
          let storedCount = 0;
          results.forEach(result => {
            const url = Object.keys(result)[0];
            distribution.indexer.store.put(result[url], url, () => {
              storedCount++;
              if (storedCount === results.length) {
                done();
              }
            });
          });
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
    
    distribution.crawler.store.put(value, key, (err) => {
      loadedCount++;
      if (loadedCount === dataset.length) {
        runMapReduce();
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // Indexer Component
  
  // Map function: Extract words from crawled content and create inverted index
  const mapper = (url, pageData) => {
    if (!pageData.content || pageData.status !== 'success') {
      return [];
    }
    
    // Extract text content (remove HTML tags in a real implementation)
    const content = pageData.content;
    
    // Tokenize content into words
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const results = [];
    
    // Create inverted index entries
    words.forEach(word => {
      results.push({ [word]: url });
    });
    
    return results;
  };
  
  // Reduce function: Combine all URLs for each word
  const reducer = (word, urls) => {
    // Remove duplicates
    const uniqueUrls = [...new Set(urls)];
    
    return { [word]: uniqueUrls };
  };
  
  // Function to run MapReduce after data is loaded
  const runMapReduce = () => {
    distribution.indexer.store.get(null, (err, keys) => {
      if (err || !keys || keys.length === 0) {
        done(new Error('No crawled data found for indexing'));
        return;
      }
      
      distribution.indexer.mr.exec({
        keys: keys,
        map: mapper,
        reduce: reducer
      }, (err, results) => {
        try {
          // Check that we have results
          expect(results.length).toBeGreaterThan(0);
          
          // Check that common words are indexed
          const exampleEntry = results.find(r => Object.keys(r)[0] === 'example');
          expect(exampleEntry).toBeDefined();
          expect(exampleEntry['example']).toContain('https://example.com');
          
          // Store the index for the query engine
          let storedCount = 0;
          results.forEach(result => {
            const word = Object.keys(result)[0];
            distribution.query.store.put(result[word], word, () => {
              storedCount++;
              if (storedCount === results.length) {
                done();
              }
            });
          });
        } catch (e) {
          done(e);
        }
      });
    });
  };
  
  // Run the indexer
  runMapReduce();
});

test('(1 pts) student test', (done) => {
  // Query Engine Component
  
  // Map function: Search for documents matching the query
  const mapper = (word, urls) => {
    // For each word in the query, return the URLs that contain it
    return [{ [word]: urls }];
  };
  
  // Reduce function: Combine results for all query terms
  const reducer = (word, urlLists) => {
    // Flatten all URL lists
    const allUrls = urlLists.flat();
    
    // Count occurrences of each URL
    const urlCounts = {};
    allUrls.forEach(url => {
      urlCounts[url] = (urlCounts[url] || 0) + 1;
    });
    
    // Sort by count (relevance)
    const sortedUrls = Object.entries(urlCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    return { [word]: sortedUrls };
  };
  
  // Test query
  const query = "example";
  
  // Function to run the query
  const runQuery = () => {
    // Get the index entries for the query terms
    distribution.query.store.get(query, (err, urls) => {
      if (err) {
        // If the word isn't in the index, use an empty array
        urls = [];
      }
      
      // Run MapReduce to process the query
      distribution.query.mr.exec({
        keys: [query],
        map: mapper,
        reduce: reducer
      }, (err, results) => {
        try {
          // Check that we have results
          expect(results.length).toBe(1);
          
          // Check that the query returned URLs
          const queryResult = results[0][query];
          expect(queryResult).toBeDefined();
          expect(queryResult.length).toBeGreaterThan(0);
          
          // The most relevant result should be example.com
          expect(queryResult[0]).toContain('example.com');
          
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  };
  
  // Run the query
  runQuery();
});

test('(1 pts) student test', (done) => {
  // End-to-end search engine test
  
  // This test demonstrates how all components work together
  
  // 1. Define a new set of URLs to crawl
  const newUrls = [
    {'new1': 'https://searchengine.test/page1'},
    {'new2': 'https://searchengine.test/page2'}
  ];
  
  // Mock content for these URLs
  const mockContent = {
    'https://searchengine.test/page1': 'This is a test page about distributed systems and search engines',
    'https://searchengine.test/page2': 'Learn more about MapReduce and distributed computing'
  };
  
  // 2. Crawler component
  const crawlerMapper = (key, url) => {
    const content = mockContent[url] || `Content from ${url}`;
    return [{ 
      [url]: {
        content: content,
        metadata: {
          crawled_at: new Date().toISOString(),
          size: content.length,
          status: 'success'
        }
      }
    }];
  };
  
  const crawlerReducer = (key, values) => {
    const result = {};
    values.forEach(value => {
      result[key] = {
        content: value.content,
        status: value.metadata.status,
        size: value.metadata.size,
        crawled_at: value.metadata.crawled_at
      };
    });
    return { [key]: result[key] };
  };
  
  // 3. Indexer component
  const indexerMapper = (url, pageData) => {
    const content = pageData.content;
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const results = [];
    
    words.forEach(word => {
      results.push({ [word]: url });
    });
    
    return results;
  };
  
  const indexerReducer = (word, urls) => {
    const uniqueUrls = [...new Set(urls)];
    return { [word]: uniqueUrls };
  };
  
  // 4. Query component
  const queryMapper = (word, urls) => {
    return [{ [word]: urls }];
  };
  
  const queryReducer = (word, urlLists) => {
    const allUrls = urlLists.flat();
    const urlCounts = {};
    allUrls.forEach(url => {
      urlCounts[url] = (urlCounts[url] || 0) + 1;
    });
    
    const sortedUrls = Object.entries(urlCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    return { [word]: sortedUrls };
  };
  
  // 5. Run the end-to-end test
  const runEndToEndTest = () => {
    // Load URLs
    let loadedCount = 0;
    newUrls.forEach(item => {
      const key = Object.keys(item)[0];
      const value = item[key];
      
      distribution.crawler.store.put(value, key, () => {
        loadedCount++;
        if (loadedCount === newUrls.length) {
          // Run crawler
          distribution.crawler.store.get(null, (err, keys) => {
            distribution.crawler.mr.exec({
              keys: keys,
              map: crawlerMapper,
              reduce: crawlerReducer
            }, (err, crawlerResults) => {
              // Store crawler results for indexer
              let storedCount = 0;
              crawlerResults.forEach(result => {
                const url = Object.keys(result)[0];
                distribution.indexer.store.put(result[url], url, () => {
                  storedCount++;
                  if (storedCount === crawlerResults.length) {
                    // Run indexer
                    distribution.indexer.store.get(null, (err, indexKeys) => {
                      distribution.indexer.mr.exec({
                        keys: indexKeys,
                        map: indexerMapper,
                        reduce: indexerReducer
                      }, (err, indexerResults) => {
                        // Store index for query engine
                        let indexStoredCount = 0;
                        indexerResults.forEach(result => {
                          const word = Object.keys(result)[0];
                          distribution.query.store.put(result[word], word, () => {
                            indexStoredCount++;
                            if (indexStoredCount === indexerResults.length) {
                              // Run query for "distributed"
                              distribution.query.store.get("distributed", (err, urls) => {
                                distribution.query.mr.exec({
                                  keys: ["distributed"],
                                  map: queryMapper,
                                  reduce: queryReducer
                                }, (err, queryResults) => {
                                  try {
                                    // Check query results
                                    expect(queryResults.length).toBe(1);
                                    const urls = queryResults[0]["distributed"];
                                    expect(urls).toContain("https://searchengine.test/page1");
                                    
                                    done();
                                  } catch (e) {
                                    done(e);
                                  }
                                });
                              });
                            }
                          });
                        });
                      });
                    });
                  }
                });
              });
            });
          });
        }
      });
    });
  };
  
  // Start the end-to-end test
  runEndToEndTest();
});

// Setup code for the tests
beforeAll((done) => {
  // Register nodes in the groups
  crawlerGroup[id.getSID(n1)] = n1;
  crawlerGroup[id.getSID(n2)] = n2;
  crawlerGroup[id.getSID(n3)] = n3;
  
  indexerGroup[id.getSID(n1)] = n1;
  indexerGroup[id.getSID(n2)] = n2;
  indexerGroup[id.getSID(n3)] = n3;
  
  queryGroup[id.getSID(n1)] = n1;
  queryGroup[id.getSID(n2)] = n2;
  queryGroup[id.getSID(n3)] = n3;
  
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
    
    const crawlerConfig = {gid: 'crawler'};
    const indexerConfig = {gid: 'indexer'};
    const queryConfig = {gid: 'query'};
    
    startNodes(() => {
      distribution.local.groups.put(crawlerConfig, crawlerGroup, () => {
        distribution.crawler.groups.put(crawlerConfig, crawlerGroup, () => {
          distribution.local.groups.put(indexerConfig, indexerGroup, () => {
            distribution.indexer.groups.put(indexerConfig, indexerGroup, () => {
              distribution.local.groups.put(queryConfig, queryGroup, () => {
                distribution.query.groups.put(queryConfig, queryGroup, () => {
                  done();
                });
              });
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