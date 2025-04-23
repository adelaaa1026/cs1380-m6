## Introduction

We developed a robust distributed search engine for GitHub Markdown files to enable efficient retrieval of technical documentation across millions of repositories .


## Background
Software engineers and developers face significant challenges when searching for relevant code examples, documentation, and technical solutions across GitHub's vast ecosystem. While GitHub provides basic search functionality, it lacks comprehensive capabilities for specifically targeting Markdown files.

## PROJECT ARCHITECTURE
### Crawler

Our crawler begins by fetching GitHub topic pages and extracting repository URLs from each topic. For every repository, it scrapes detailed metadata—including the README content, list of topics, primary programming language, star and fork counts, and author and repo names—directly from the HTML of the repository page. This enriched information is then stored in the store services of a distributed group of crawler nodes. Once all data is collected, a MapReduce pipeline is executed across the distributed nodes to transform the raw metadata into a structured format suitable for indexing. This prepares the data for the Indexer group to efficiently organize, query, and serve downstream applications such as search and recommendation.

### Indexer

The indexer reads from the distributed store in the group  and processes the downloaded markdown files.
It utilizes the distributed MapReduce infrastructure.
The mapper function takes in the (repo_url, metadata) where the metadata includes readme, repo_name, languages, topics, stargazer_count, forks_count, etc.  Then it calculates the local_weight of each token t in the repo using the formula  


 <img width="169" alt="Screenshot 2025-04-23 at 17 26 24" src="https://github.com/user-attachments/assets/7ec6f2b3-464a-42bd-8933-e9d0f88e6ebb" />






The mapper emits (token, repo_url, local_weight)
The reducer uses word/token to aggregate the result. It first calculates the idf (inverse document frequency) and then it calculates the total_weight of each repo using the formula 

<img width="128" alt="Screenshot 2025-04-23 at 17 26 47" src="https://github.com/user-attachments/assets/836dad79-d272-4dc2-a508-24fda3c1c12d" />

Then we sort the repos based on the total weight and store index in a distributed storage backend.



### Querer

Our query subsystem analyzes search terms, distributes load across nodes based on term frequency, and combines partial results from multiple nodes. It leverages a MapReduce-style distributed execution engine to retrieve relevant documents from inverted indices and supports multi-term scoring using TF-IDF and PageRank. To ensure responsiveness, we use an in-memory LRU cache with expiry, and results are re-ranked locally with a tunable relevance function. Additional capabilities include real-time suggestions, query preprocessing, and contextual snippet generation for user-facing summaries. Health checks and usage statistics are built-in, enabling fault diagnostics and performance tuning across the cluster.


## Discussion
Major Technical Issues: In the process of implementing M6, we encountered challenges in building a fully distributed crawler with balanced load and non-redundant downloads, as well as synchronizing the iterative computation of PageRank across multiple nodes.
Our final solution for this problem includes URL-based sharding with local Bloom filters to prevent duplicates, and barrier-synchronized MapReduce iterations with convergence detection for reliable PageRank execution.

Comparison with M0: The distributed implementation has significantly improved throughput and scalability compared to our baseline implementation of M0. However, it comes with the increase complexity in system coordination and debugging. 

Possible Improvements: Right now we only index individual token. But given more time, we can incorporate bigram or trigram as well to improve our search engine's capacity. Due to the asynchronous nature of the Fetch API, we decoupled network-bound operations from the synchronous MapReduce pipeline by moving all asynchronous repository fetching into a dedicated pre-processing stage. Possible improvements: one way to improve scalability is to distribute the URL-fetching workload across nodes, allowing each to independently process and enrich repositories in parallel before contributing to the shared data store.

