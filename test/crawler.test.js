jest.setTimeout(120000); // 120 seconds timeout for all tests in this file

const distribution = require("../config.js");
const id = distribution.util.id;
const { JSDOM } = require("jsdom");

// Define the crawler group
const crawlerGroup = {};

// Define the indexer group for processing the crawled data
// const indexerGroup = {};

// Define the nodes 
// (local)
// const n1 = { ip: "127.0.0.1", port: 8001 };
// const n2 = { ip: "127.0.0.1", port: 8002 };
// const n3 = { ip: "127.0.0.1", port: 8003 };
// const n4 = { ip: "127.0.0.1", port: 8004 };

// Define the actual public IPs and ports for communication
const n1 = {ip: 'ec2-3-145-107-11.us-east-2.compute.amazonaws.com', port: 8001};
const n2 = {ip: 'ec2-18-226-94-153.us-east-2.compute.amazonaws.com', port: 8002};
// const n3 = {ip: 'ec2-3-141-4-153.us-east-2.compute.amazonaws.com', port: 8003};
// const n4 = {ip: 'ec2-3-141-4-153.us-east-2.compute.amazonaws.com', port: 8004};

// Create fake configs that match what the nodes use internally
const n1_internal = {ip: '0.0.0.0', port: 8001};
const n2_internal = {ip: '0.0.0.0', port: 8002};
// const n3_internal = {ip: '0.0.0.0', port: 8003};
// const n4_internal = {ip: '0.0.0.0', port: 8004};

// Local server for orchestration
let localServer = null;

// Near the top of your file
let coordinatorConfig;
try {
  coordinatorConfig = require('../coordinator-config.json');
  console.log("Loaded coordinator config:", coordinatorConfig);
} catch (e) {
  console.log("No coordinator config found, will use defaults");
  coordinatorConfig = null;
}

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
    //console.log(`Fetched ${url} successfully`);
    //console.log(`Response status: ${res.status}`);

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
      const selectedTopics = topicLinks.slice(0, 2);

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

      return repoUrls.slice(0, 5); // Limit to 5 repos
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
        //console.log(
          //`Fetching metadata for repository ${i + 1}/${repoUrls.length}: ${url}`
        //);
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
            //console.log(
            //  `Metadata for ${metadata.url} stored successfully with key repo${index}`
            //);
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
  // indexerGroup[id.getSID(n3)] = n3;
  // indexerGroup[id.getSID(n4)] = n4;

  distribution.node.start((server) => {
    localServer = server;
    
    // Get the actual address and port
    const actualAddress = server.address();
    
    // Set the coordinator node explicitly
    global.coordinatorNode = coordinatorConfig || {
      ip: actualAddress.address === '::' ? '127.0.0.1' : actualAddress.address,
      port: actualAddress.port
    };
    
    console.log("Using coordinator:", global.coordinatorNode);

    const startNodes = () => {
      distribution.local.status.spawn(n1_internal, (e, v) => {
        distribution.local.status.spawn(n2_internal, (e, v) => {
          setupGroups();
        });
      });
    };

    const setupGroups = () => {
      const crawlerConfig = { gid: "crawler" };
      // const indexerConfig = { gid: "indexer" };

      distribution.local.groups.put(crawlerConfig, crawlerGroup, (e, v) => {
        distribution.crawler.groups.put(crawlerConfig, crawlerGroup, (e, v) => {
          done()
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
     localServer.close();
          done();
    });
  });
});
