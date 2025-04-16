// jest.setTimeout(120000); // 120 seconds timeout for all tests in this file

// const distribution = require("../config.js");
// const id = distribution.util.id;
// const { JSDOM } = require("jsdom");

// // Define the crawler group
// const crawlerGroup = {};

// // Define the indexer group for processing the crawled data
// const indexerGroup = {};

// // Define the nodes
// const n1 = { ip: "127.0.0.1", port: 8001 };
// const n2 = { ip: "127.0.0.1", port: 8002 };
// const n3 = { ip: "127.0.0.1", port: 8003 };
// const n4 = { ip: "127.0.0.1", port: 8004 };

// // Local server for orchestration
// let localServer = null;

// // Helper function to fetch URLs using the fetch API
// async function fetchUrl(url) {
//   try {
//     const res = await fetch(url, {
//       headers: {
//         "User-Agent": "GitHub-Crawler-Bot/1.0",
//       },
//       redirect: "follow",
//     });

//     if (!res.ok) {
//       throw new Error(`Request failed with status code ${res.status}`);
//     }
//     console.log(`Fetched ${url} successfully`);
//     console.log(`Response status: ${res.status}`);
//     const bodyText = await res.text();
//     return bodyText;
//   } catch (err) {
//     console.error(`Failed to fetch ${url}:`, err);
//     throw err;
//   }
// }

// test("(50 pts) github.crawler:fetch_and_process", (done) => {
//   // Mapper function remains the same structure
//   const mapper = (key, repoData) => {
//     console.log(`Processing repository data for key: ${key}`);

//     try {
//       // Extract the repository URL from the data
//       const repoUrl = repoData.url;

//       // Create result structure as required
//       const result = {};
//       result[repoUrl] = {
//         repo_id: repoData.repo_id,
//         readme: repoData.readme || "",
//         repo_name: repoData.repo_name,
//         author: repoData.author,
//         topics: repoData.topics || [],
//         language: repoData.language || "Unknown",
//         stargazers_count: repoData.stargazers_count || 0,
//         forks_count: repoData.forks_count || 0,
//       };

//       return [result];
//     } catch (error) {
//       console.error(
//         `Error processing repository data for ${key}:`,
//         error.message
//       );
//       return [];
//     }
//   };

//   const reducer = (key, values) => {
//     if (values && values.length > 0) {
//       const result = {};
//       result[key] = values[0];
//       return result;
//     }
//     return null;
//   };

//   // Function to fetch repository metadata from a GitHub repo URL
//   const fetchRepoMetadata = async (repoUrl) => {
//     console.log(`Fetching metadata for ${repoUrl}...`);

//     try {
//       const html = await fetchUrl(repoUrl);
//       const dom = new JSDOM(html);
//       const document = dom.window.document;

//       // Extract username and repo name from URL
//       const urlParts = repoUrl.split("/");
//       const username = urlParts[3];
//       const repoName = urlParts[4];

//       // Extract language
//       let language = "Unknown";
//       const languageElement = document.querySelector(
//         '[itemprop="programmingLanguage"]'
//       );
//       if (languageElement) {
//         language = languageElement.textContent.trim();
//       }

//       // Extract stars count
//       let stargazers_count = 0;
//       const starsElement = document.querySelector('a[href$="/stargazers"]');
//       if (starsElement) {
//         const starsText = starsElement.textContent.trim().replace(/,/g, "");
//         const starsMatch = starsText.match(/\d+/);
//         if (starsMatch) {
//           stargazers_count = parseInt(starsMatch[0]);
//         }
//       }

//       // Extract forks count
//       let forks_count = 0;
//       const forksElement = document.querySelector(
//         'a[href$="/network/members"]'
//       );
//       if (forksElement) {
//         const forksText = forksElement.textContent.trim().replace(/,/g, "");
//         const forksMatch = forksText.match(/\d+/);
//         if (forksMatch) {
//           forks_count = parseInt(forksMatch[0]);
//         }
//       }

//       // Extract topics
//       const topics = [];
//       const topicElements = document.querySelectorAll("a.topic-tag");
//       topicElements.forEach((element) => {
//         topics.push(element.textContent.trim());
//       });

//       // Extract readme (simplified)
//       let readme = "";
//       const readmeElement = document.querySelector("#readme");
//       if (readmeElement) {
//         readme = readmeElement.textContent.trim();
//         // Truncate long readmes to avoid excessive data
//         if (readme.length > 5000) {
//           readme = readme.substring(0, 5000) + "... [truncated]";
//         }
//       }

//       // Return structured metadata
//       return {
//         url: repoUrl,
//         repo_id: `${username}/${repoName}`,
//         readme: readme,
//         repo_name: repoName,
//         author: username,
//         topics: topics,
//         language: language,
//         stargazers_count: stargazers_count,
//         forks_count: forks_count,
//       };
//     } catch (error) {
//       console.error(`Error fetching metadata for ${repoUrl}:`, error);

//       // Return basic info in case of error
//       const urlParts = repoUrl.split("/");
//       return {
//         url: repoUrl,
//         repo_id: `${urlParts[3]}/${urlParts[4]}`,
//         readme: "",
//         repo_name: urlParts[4],
//         author: urlParts[3],
//         topics: [],
//         language: "Unknown",
//         stargazers_count: 0,
//         forks_count: 0,
//       };
//     }
//   };

//   const fetchTopicsPage = async () => {
//     console.log("Fetching GitHub topics page...");

//     try {
//       const html = await fetchUrl("https://github.com/topics");
//       const dom = new JSDOM(html);
//       const document = dom.window.document;

//       const topicLinks = Array.from(
//         document.querySelectorAll("a[href^='/topics/']")
//       )
//         .map((a) => a.href)
//         .filter((href, i, self) => self.indexOf(href) === i);

//       const repoUrls = [];
//       const selectedTopics = topicLinks.slice(0, 3);

//       for (const topicHref of selectedTopics) {
//         const topicUrl = `https://github.com${topicHref}`;
//         console.log(`Fetching topic page: ${topicUrl}`);

//         const topicHtml = await fetchUrl(topicUrl);
//         const topicDom = new JSDOM(topicHtml);
//         const topicDoc = topicDom.window.document;

//         const repos = Array.from(topicDoc.querySelectorAll("h3 a"))
//           .map((a) => a.href)
//           .filter((href) => href.startsWith("/"));

//         for (const repoPath of repos) {
//           if (repoPath.split("/").length === 3) {
//             const fullUrl = `https://github.com${repoPath}`;
//             repoUrls.push(fullUrl);
//           }
//         }
//       }

//       return repoUrls.slice(0, 10); // Limit to 5 repos
//     } catch (error) {
//       console.error("Error fetching topics page:", error.message);
//       return [];
//     }
//   };

//   // Process all repositories and fetch their metadata
//   const processRepositories = async (repoUrls) => {
//     console.log(`Processing ${repoUrls.length} repositories...`);

//     const repoMetadata = [];

//     // Process each repository URL and fetch its metadata
//     for (let i = 0; i < repoUrls.length; i++) {
//       const url = repoUrls[i];
//       try {
//         console.log(
//           `Fetching metadata for repository ${i + 1}/${repoUrls.length}: ${url}`
//         );
//         const metadata = await fetchRepoMetadata(url);
//         repoMetadata.push(metadata);

//         // Add a small delay to avoid hitting rate limits
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       } catch (error) {
//         console.error(`Error processing ${url}:`, error.message);
//         // Create basic metadata in case of error
//         const urlParts = url.split("/");
//         repoMetadata.push({
//           url: url,
//           repo_id: `${urlParts[3]}/${urlParts[4]}`,
//           readme: "",
//           repo_name: urlParts[4],
//           author: urlParts[3],
//           topics: [],
//           language: "Unknown",
//           stargazers_count: 0,
//           forks_count: 0,
//         });
//       }
//     }

//     return repoMetadata;
//   };

//   // Store repository metadata in the distributed store
//   const storeRepositoryMetadata = (repoMetadata, callback) => {
//     if (repoMetadata.length === 0) {
//       callback();
//       return;
//     }

//     let stored = 0;

//     repoMetadata.forEach((metadata, index) => {
//       // Store with repo index as the key identifier
//       distribution.crawler.store.put(
//         metadata,
//         `repo${index}`,
//         (err, result) => {
//           if (err && Object.keys(err).length > 0) {
//             console.error(`Error storing metadata for ${metadata.url}:`, err);
//           } else {
//             console.log(
//               `Metadata for ${metadata.url} stored successfully with key repo${index}`
//             );
//           }

//           stored++;
//           if (stored === repoMetadata.length) {
//             callback();
//           }
//         }
//       );
//     });
//   };

//   const runMapReduce = () => {
//     distribution.crawler.store.get(null, (err, keys) => {
//       if (err && Object.keys(err).length > 0) {
//         console.error("Error getting repository keys:", err);
//         done(err);
//         return;
//       }

//       console.log("[runMapReduce] Retrieved repository keys:", keys);

//       distribution.crawler.mr.exec(
//         {
//           keys: keys,
//           map: mapper,
//           reduce: reducer,
//         },
//         (err, results) => {
//           if (err && Object.keys(err).length > 0) {
//             console.error("Error in MapReduce execution:", err);
//             done(err);
//             return;
//           }

//           console.log("MapReduce results:", JSON.stringify(results, null, 2));

//           try {
//             expect(results).toBeDefined();
//             expect(results.length).toBeGreaterThan(0);

//             results.forEach((result) => {
//               const repoUrl = Object.keys(result)[0];
//               const repository = result[repoUrl];

//               expect(repoUrl).toMatch(/^https:\/\/github.com\//);
//               expect(repository).toHaveProperty("repo_id");
//               expect(repository).toHaveProperty("readme");
//               expect(repository).toHaveProperty("repo_name");
//               expect(repository).toHaveProperty("author");
//               expect(repository).toHaveProperty("topics");
//               expect(repository).toHaveProperty("language");
//               expect(repository).toHaveProperty("stargazers_count");
//               expect(repository).toHaveProperty("forks_count");
//             });

//             done();
//           } catch (error) {
//             done(error);
//           }
//         }
//       );
//     });
//   };

//   // Main execution flow
//   fetchTopicsPage()
//     .then(async (repoUrls) => {
//       if (repoUrls.length === 0) {
//         console.error("No repository URLs found");
//         done(new Error("No repository URLs found"));
//         return;
//       }

//       console.log(`Found ${repoUrls.length} repository URLs`);

//       // Process repositories and fetch metadata
//       const repoMetadata = await processRepositories(repoUrls);

//       // Store the metadata in the distributed store
//       storeRepositoryMetadata(repoMetadata, () => {
//         console.log("All repository metadata stored, starting MapReduce");
//         runMapReduce();
//       });
//     })
//     .catch((error) => {
//       console.error("Error in crawling process:", error);
//       done(error);
//     });
// }, 100000);

// // Setup and teardown code remain unchanged
// beforeAll((done) => {
//   crawlerGroup[id.getSID(n1)] = n1;
//   crawlerGroup[id.getSID(n2)] = n2;
//   indexerGroup[id.getSID(n3)] = n3;
//   indexerGroup[id.getSID(n4)] = n4;

//   distribution.node.start((server) => {
//     localServer = server;

//     const actualAddress = server.address();
//     const coordinatorNode = {
//       ip: actualAddress.address === "::" ? "127.0.0.1" : actualAddress.address,
//       port: actualAddress.port,
//     };

//     console.log("Using coordinator:", coordinatorNode);

//     const startNodes = () => {
//       distribution.local.status.spawn(n1, (e, v) => {
//         distribution.local.status.spawn(n2, (e, v) => {
//           distribution.local.status.spawn(n3, (e, v) => {
//             distribution.local.status.spawn(n4, (e, v) => {
//               setupGroups();
//             });
//           });
//         });
//       });
//     };

//     const setupGroups = () => {
//       const crawlerConfig = { gid: "crawler" };
//       const indexerConfig = { gid: "indexer" };

//       distribution.local.groups.put(crawlerConfig, crawlerGroup, (e, v) => {
//         distribution.crawler.groups.put(crawlerConfig, crawlerGroup, (e, v) => {
//           distribution.local.groups.put(indexerConfig, indexerGroup, (e, v) => {
//             distribution.indexer.groups.put(
//               indexerConfig,
//               indexerGroup,
//               (e, v) => {
//                 done();
//               }
//             );
//           });
//         });
//       });
//     };

//     startNodes();
//   });
// });

// afterAll((done) => {
//   const remote = { service: "status", method: "stop" };

//   remote.node = n1;
//   distribution.local.comm.send([], remote, (e, v) => {
//     remote.node = n2;
//     distribution.local.comm.send([], remote, (e, v) => {
//       remote.node = n3;
//       distribution.local.comm.send([], remote, (e, v) => {
//         remote.node = n4;
//         distribution.local.comm.send([], remote, (e, v) => {
//           localServer.close();
//           done();
//         });
//       });
//     });
//   });
// });

jest.setTimeout(120000); // 120 seconds timeout for all tests in this file

const distribution = require("../config.js");
const id = distribution.util.id;
const { JSDOM } = require("jsdom");

// Define the crawler group
const crawlerGroup = {};

// Define the indexer group for processing the crawled data
const indexerGroup = {};

// Define the nodes
const n1 = { ip: "127.0.0.1", port: 8001 };
const n2 = { ip: "127.0.0.1", port: 8002 };
const n3 = { ip: "127.0.0.1", port: 8003 };
const n4 = { ip: "127.0.0.1", port: 8004 };

// Local server for orchestration
let localServer = null;

// Helper function to fetch URLs using the fetch API
async function fetchUrl(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GitHub-Crawler-Bot/1.0",
        ...options.headers,
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`Request failed with status code ${res.status}`);
    }
    console.log(`Fetched ${url} successfully`);
    console.log(`Response status: ${res.status}`);

    // Return JSON if expected, otherwise return text
    if (options.json) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err);
    throw err;
  }
}

test("(50 pts) github.crawler:fetch_and_process", (done) => {
  // Mapper function remains the same structure
  const mapper = (key, repoData) => {
    console.log(`Processing repository data for key: ${key}`);

    try {
      // Extract the repository URL from the data
      const repoUrl = repoData.url;

      // Create result structure as required
      const result = {};
      result[repoUrl] = {
        repo_id: repoData.repo_id,
        readme: repoData.readme || "",
        repo_name: repoData.repo_name,
        author: repoData.author,
        topics: repoData.topics || [],
        language: repoData.language || "Unknown",
        stargazers_count: repoData.stargazers_count || 0,
        forks_count: repoData.forks_count || 0,
      };

      return [result];
    } catch (error) {
      console.error(
        `Error processing repository data for ${key}:`,
        error.message
      );
      return [];
    }
  };

  const reducer = (key, values) => {
    if (values && values.length > 0) {
      const result = {};
      result[key] = values[0];
      return result;
    }
    return null;
  };

  // Function to fetch repository metadata using GitHub API
  const fetchRepoMetadata = async (repoUrl) => {
    console.log(`Fetching metadata for ${repoUrl}...`);

    try {
      // Extract username and repo name from URL
      const urlParts = repoUrl.split("/");
      const username = urlParts[3];
      const repoName = urlParts[4];

      // GitHub API URL for repository information
      const apiUrl = `https://api.github.com/repos/${username}/${repoName}`;

      // Fetch repository information
      const repoData = await fetchUrl(apiUrl, {
        json: true,
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      });

      // Fetch readme content
      let readme = "";
      try {
        const readmeUrl = `https://api.github.com/repos/${username}/${repoName}/readme`;
        const readmeData = await fetchUrl(readmeUrl, {
          json: true,
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        });

        // Readme content is base64 encoded
        if (readmeData.content) {
          const base64Content = readmeData.content.replace(/\n/g, "");
          readme = Buffer.from(base64Content, "base64").toString("utf8");

          // Truncate long readmes
          if (readme.length > 5000) {
            readme = readme.substring(0, 5000) + "... [truncated]";
          }
        }
      } catch (error) {
        console.log(`Could not fetch README for ${repoUrl}: ${error.message}`);
      }

      // Return structured metadata
      return {
        url: repoUrl,
        repo_id: `${username}/${repoName}`,
        readme: readme,
        repo_name: repoName,
        author: username,
        topics: repoData.topics || [],
        language: repoData.language || "Unknown",
        stargazers_count: repoData.stargazers_count || 0,
        forks_count: repoData.forks_count || 0,
      };
    } catch (error) {
      console.error(`Error fetching metadata for ${repoUrl}:`, error);

      // Return basic info in case of error
      const urlParts = repoUrl.split("/");
      return {
        url: repoUrl,
        repo_id: `${urlParts[3]}/${urlParts[4]}`,
        readme: "",
        repo_name: urlParts[4],
        author: urlParts[3],
        topics: [],
        language: "Unknown",
        stargazers_count: 0,
        forks_count: 0,
      };
    }
  };

  const fetchTopicsPage = async () => {
    console.log("Fetching GitHub topics page...");

    try {
      const html = await fetchUrl("https://github.com/topics");
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const topicLinks = Array.from(
        document.querySelectorAll("a[href^='/topics/']")
      )
        .map((a) => a.href)
        .filter((href, i, self) => self.indexOf(href) === i);

      const repoUrls = [];
      const selectedTopics = topicLinks.slice(0, 3);

      for (const topicHref of selectedTopics) {
        const topicUrl = `https://github.com${topicHref}`;
        console.log(`Fetching topic page: ${topicUrl}`);

        const topicHtml = await fetchUrl(topicUrl);
        const topicDom = new JSDOM(topicHtml);
        const topicDoc = topicDom.window.document;

        const repos = Array.from(topicDoc.querySelectorAll("h3 a"))
          .map((a) => a.href)
          .filter((href) => href.startsWith("/"));

        for (const repoPath of repos) {
          if (repoPath.split("/").length === 3) {
            const fullUrl = `https://github.com${repoPath}`;
            repoUrls.push(fullUrl);
          }
        }
      }

      return repoUrls.slice(0, 20); // Limit to 5 repos
    } catch (error) {
      console.error("Error fetching topics page:", error.message);
      return [];
    }
  };

  // Process all repositories and fetch their metadata
  const processRepositories = async (repoUrls) => {
    console.log(`Processing ${repoUrls.length} repositories...`);

    const repoMetadata = [];

    // Process each repository URL and fetch its metadata
    for (let i = 0; i < repoUrls.length; i++) {
      const url = repoUrls[i];
      try {
        console.log(
          `Fetching metadata for repository ${i + 1}/${repoUrls.length}: ${url}`
        );
        const metadata = await fetchRepoMetadata(url);
        repoMetadata.push(metadata);

        // Add a delay to avoid hitting GitHub API rate limits
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error processing ${url}:`, error.message);
        // Create basic metadata in case of error
        const urlParts = url.split("/");
        repoMetadata.push({
          url: url,
          repo_id: `${urlParts[3]}/${urlParts[4]}`,
          readme: "",
          repo_name: urlParts[4],
          author: urlParts[3],
          topics: [],
          language: "Unknown",
          stargazers_count: 0,
          forks_count: 0,
        });
      }
    }

    return repoMetadata;
  };

  // Store repository metadata in the distributed store
  const storeRepositoryMetadata = (repoMetadata, callback) => {
    if (repoMetadata.length === 0) {
      callback();
      return;
    }

    let stored = 0;

    repoMetadata.forEach((metadata, index) => {
      // Store with repo index as the key identifier
      distribution.crawler.store.put(
        metadata,
        `repo${index}`,
        (err, result) => {
          if (err && Object.keys(err).length > 0) {
            console.error(`Error storing metadata for ${metadata.url}:`, err);
          } else {
            console.log(
              `Metadata for ${metadata.url} stored successfully with key repo${index}`
            );
          }

          stored++;
          if (stored === repoMetadata.length) {
            callback();
          }
        }
      );
    });
  };

  const runMapReduce = () => {
    distribution.crawler.store.get(null, (err, keys) => {
      if (err && Object.keys(err).length > 0) {
        console.error("Error getting repository keys:", err);
        done(err);
        return;
      }

      console.log("[runMapReduce] Retrieved repository keys:", keys);

      distribution.crawler.mr.exec(
        {
          keys: keys,
          map: mapper,
          reduce: reducer,
        },
        (err, results) => {
          if (err && Object.keys(err).length > 0) {
            console.error("Error in MapReduce execution:", err);
            done(err);
            return;
          }

          console.log("MapReduce results:", JSON.stringify(results, null, 2));

          try {
            expect(results).toBeDefined();
            expect(results.length).toBeGreaterThan(0);

            results.forEach((result) => {
              const repoUrl = Object.keys(result)[0];
              const repository = result[repoUrl];

              expect(repoUrl).toMatch(/^https:\/\/github.com\//);
              expect(repository).toHaveProperty("repo_id");
              expect(repository).toHaveProperty("readme");
              expect(repository).toHaveProperty("repo_name");
              expect(repository).toHaveProperty("author");
              expect(repository).toHaveProperty("topics");
              expect(repository).toHaveProperty("language");
              expect(repository).toHaveProperty("stargazers_count");
              expect(repository).toHaveProperty("forks_count");
            });

            done();
          } catch (error) {
            done(error);
          }
        }
      );
    });
  };

  // Main execution flow
  fetchTopicsPage()
    .then(async (repoUrls) => {
      if (repoUrls.length === 0) {
        console.error("No repository URLs found");
        done(new Error("No repository URLs found"));
        return;
      }

      console.log(`Found ${repoUrls.length} repository URLs`);

      // Process repositories and fetch metadata
      const repoMetadata = await processRepositories(repoUrls);

      // Store the metadata in the distributed store
      storeRepositoryMetadata(repoMetadata, () => {
        console.log("All repository metadata stored, starting MapReduce");
        runMapReduce();
      });
    })
    .catch((error) => {
      console.error("Error in crawling process:", error);
      done(error);
    });
}, 100000);

// Setup and teardown code remain unchanged
beforeAll((done) => {
  crawlerGroup[id.getSID(n1)] = n1;
  crawlerGroup[id.getSID(n2)] = n2;
  indexerGroup[id.getSID(n3)] = n3;
  indexerGroup[id.getSID(n4)] = n4;

  distribution.node.start((server) => {
    localServer = server;

    const actualAddress = server.address();
    const coordinatorNode = {
      ip: actualAddress.address === "::" ? "127.0.0.1" : actualAddress.address,
      port: actualAddress.port,
    };

    console.log("Using coordinator:", coordinatorNode);

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

    const setupGroups = () => {
      const crawlerConfig = { gid: "crawler" };
      const indexerConfig = { gid: "indexer" };

      distribution.local.groups.put(crawlerConfig, crawlerGroup, (e, v) => {
        distribution.crawler.groups.put(crawlerConfig, crawlerGroup, (e, v) => {
          distribution.local.groups.put(indexerConfig, indexerGroup, (e, v) => {
            distribution.indexer.groups.put(
              indexerConfig,
              indexerGroup,
              (e, v) => {
                done();
              }
            );
          });
        });
      });
    };

    startNodes();
  });
});

afterAll((done) => {
  const remote = { service: "status", method: "stop" };

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
