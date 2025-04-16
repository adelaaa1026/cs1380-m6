/**
 * 分布式搜索引擎查询组件
 * 
 * 此实现依赖于现有的分布式系统架构
 * 使用distribution.all和distribution.local服务
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// 搜索引擎查询模块配置
const DEFAULT_CONFIG = {
  port: process.env.PORT || 8080,
  host: process.env.HOST || '0.0.0.0',
  maxResults: 10,
  pageRankWeight: 0.5,
  tfidfWeight: 1.0,
  cacheSize: 1000,
  cacheExpiry: 5 * 60 * 1000, // 5分钟
  queryTimeout: 30000, // 30秒
  debug: process.env.DEBUG || false
};

class DistributedSearchQuery {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 缓存系统
    this.cache = {
      items: new Map(),
      timestamps: new Map()
    };
    
    // 服务器实例
    this.server = null;
    
    // 注册到distribution系统
    this.registerServices();
    
    // 统计数据
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      failedQueries: 0,
      avgQueryTime: 0
    };
  }

  /**
   * 将查询服务注册到分布式系统
   */
  registerServices() {
    // 确保全局分布式环境已初始化
    if (!global.distribution) {
      throw new Error('Distributed system not initialized. Call setupDistributedSystem() first.');
    }

    // 注册搜索路由
    global.distribution.local.routes.put({
      search: this.handleSearch.bind(this),
      suggest: this.handleSuggest.bind(this),
      health: this.handleHealth.bind(this)
    }, 'queryService', (err, result) => {
      if (err) {
        console.error('Error registering query services:', err);
      } else {
        console.log('Query services registered:', result);
      }
    });
  }

  /**
   * 启动HTTP服务器
   */
  start() {
    if (this.server) {
      return;
    }

    // 创建HTTP服务器
    this.server = http.createServer((req, res) => {
      // 解析URL和查询参数
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;
      
      // 处理请求
      if (pathname === '/search') {
        this.handleHttpSearch(parsedUrl.query, res);
      } else if (pathname === '/suggest') {
        this.handleHttpSuggest(parsedUrl.query, res);
      } else if (pathname === '/health') {
        this.handleHttpHealth(req, res);
      } else if (pathname === '/stats') {
        this.handleHttpStats(req, res);
      } else {
        // 返回404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    // 启动服务器
    this.server.listen(this.config.port, this.config.host, () => {
      console.log(`Query server running at http://${this.config.host}:${this.config.port}/`);
    });
  }

  /**
   * 停止HTTP服务器
   */
  stop(callback) {
    if (this.server) {
      this.server.close(callback);
      this.server = null;
    } else if (callback) {
      callback();
    }
  }

  /**
   * 处理HTTP搜索请求
   */
  handleHttpSearch(query, res) {
    const q = query.q || '';
    const maxResults = parseInt(query.n || this.config.maxResults, 10);
    
    if (!q) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
      return;
    }
    
    // 执行搜索
    this.search(q, maxResults, (err, results) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          query: q,
          numResults: results.length,
          results: results
        }));
      }
    });
  }
  
  /**
   * 处理HTTP建议请求
   */
  handleHttpSuggest(query, res) {
    const q = query.q || '';
    const maxSuggestions = parseInt(query.n || 5, 10);
    
    if (!q) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
      return;
    }
    
    // 获取建议
    this.getSuggestions(q, maxSuggestions, (err, suggestions) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          query: q,
          suggestions: suggestions
        }));
      }
    });
  }
  
  /**
   * 处理HTTP健康检查请求
   */
  handleHttpHealth(req, res) {
    this.getHealthStatus((status) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    });
  }
  
  /**
   * 处理HTTP统计信息请求
   */
  handleHttpStats(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.stats));
  }
  
  /**
   * 处理分布式系统的搜索调用
   */
  handleSearch(query, maxResults, callback) {
    this.search(query, maxResults, callback);
  }
  
  /**
   * 处理分布式系统的建议调用
   */
  handleSuggest(partialQuery, maxSuggestions, callback) {
    this.getSuggestions(partialQuery, maxSuggestions, callback);
  }
  
  /**
   * 处理分布式系统的健康检查调用
   */
  handleHealth(callback) {
    this.getHealthStatus(status => callback(null, status));
  }
  
  /**
   * 执行搜索
   * 
   * @param {string} query 查询字符串
   * @param {number} maxResults 最大结果数
   * @param {Function} callback 回调函数 (err, results)
   */
  search(query, maxResults, callback) {
    const startTime = Date.now();
    this.stats.totalQueries++;
    
    // 检查缓存
    const cacheKey = `search:${query}:${maxResults}`;
    const cachedResult = this.getCachedItem(cacheKey);
    
    if (cachedResult) {
      this.stats.cacheHits++;
      return callback(null, cachedResult);
    }
    
    this.stats.cacheMisses++;
    
    // 预处理查询
    const queryTerms = this.preprocessQuery(query);
    if (!queryTerms.length) {
      return callback(null, []);
    }
    
    // 使用MapReduce从分布式键值存储中检索倒排索引
    this.executeMapReduceSearch(queryTerms, maxResults, (err, results) => {
      if (err) {
        this.stats.failedQueries++;
        return callback(err);
      }
      
      // 更新统计信息
      const queryTime = Date.now() - startTime;
      this.stats.avgQueryTime = (this.stats.avgQueryTime * (this.stats.totalQueries - 1) + queryTime) / this.stats.totalQueries;
      
      // 更新缓存
      this.setCachedItem(cacheKey, results);
      
      callback(null, results);
    });
  }
  
  /**
   * 处理查询自动完成建议
   * 
   * @param {string} partialQuery 部分查询
   * @param {number} maxSuggestions 最大建议数
   * @param {Function} callback 回调函数 (err, suggestions)
   */
  getSuggestions(partialQuery, maxSuggestions, callback) {
    // 检查缓存
    const cacheKey = `suggest:${partialQuery}:${maxSuggestions}`;
    const cachedSuggestions = this.getCachedItem(cacheKey);
    
    if (cachedSuggestions) {
      return callback(null, cachedSuggestions);
    }
    
    // 预处理查询
    const queryTerms = this.preprocessQuery(partialQuery);
    if (!queryTerms.length) {
      return callback(null, []);
    }
    
    // 获取最后一个词的前缀匹配建议
    const lastTerm = queryTerms[queryTerms.length - 1];
    const prefixKey = `prefix:${lastTerm}`;
    
    // 从分布式键值存储中获取前缀建议
    global.distribution.all.store.get(prefixKey, (err, matchingTerms) => {
      if (err || !matchingTerms || !Array.isArray(matchingTerms)) {
        // 尝试获取预计算的建议
        global.distribution.all.store.get(`suggestions:${partialQuery.toLowerCase()}`, (err, suggestions) => {
          if (err || !suggestions) {
            return callback(null, []);
          }
          
          const result = Array.isArray(suggestions) ? suggestions.slice(0, maxSuggestions) : [];
          this.setCachedItem(cacheKey, result);
          callback(null, result);
        });
        return;
      }
      
      // 构建建议
      const suggestions = [];
      for (const term of matchingTerms.slice(0, maxSuggestions)) {
        // 替换最后一个词构建完整建议
        const suggestion = [...queryTerms.slice(0, -1), term].join(' ');
        suggestions.push(suggestion);
      }
      
      this.setCachedItem(cacheKey, suggestions);
      callback(null, suggestions);
    });
  }
  
  /**
   * 使用分布式MapReduce执行搜索
   * 
   * @param {string[]} queryTerms 查询词
   * @param {number} maxResults 最大结果数
   * @param {Function} callback 回调函数 (err, results)
   */
  executeMapReduceSearch(queryTerms, maxResults, callback) {
    // 准备MapReduce任务
    const mapFunction = `
      function map(key, value, emit) {
        // 获取文档信息或倒排索引信息
        if (key.startsWith('inverted_index:')) {
          const term = key.substring('inverted_index:'.length);
          if (QUERY_TERMS.includes(term)) {
            // 为每个匹配的文档ID发出一个记录
            for (const docId in value) {
              if (value.hasOwnProperty(docId)) {
                emit(docId, { 
                  term: term, 
                  frequency: value[docId],
                  termCount: 1
                });
              }
            }
          }
        }
      }
    `;
    
    const reduceFunction = `
      function reduce(key, values, emit) {
        // key是文档ID，values是包含词频信息的对象数组
        const termFreqs = {};
        let totalScore = 0;
        let termCount = 0;
        
        // 合并来自多个词的信息
        for (const value of values) {
          if (value.term && value.frequency) {
            termFreqs[value.term] = value.frequency;
            termCount += value.termCount || 1;
          }
        }
        
        // 计算TF-IDF分数(简化版本)
        // 这里只是一个简单的加权和，真实系统会使用完整的TF-IDF公式
        for (const term in termFreqs) {
          totalScore += termFreqs[term];
        }
        
        // 只发出包含所有查询词的文档
        if (termCount >= QUERY_TERMS.length) {
          emit(key, {
            docId: key,
            score: totalScore,
            termFreqs: termFreqs
          });
        }
      }
    `;
    
    // 准备MapReduce配置
    const config = {
      input: { type: 'kv_scan', pattern: ['inverted_index:*', 'doc:*'] },
      output: { type: 'memory' },
      context: {
        QUERY_TERMS: JSON.stringify(queryTerms)
      }
    };
    
    // 执行MapReduce任务
    global.distribution.all.mr.exec({
      map: mapFunction,
      reduce: reduceFunction,
      config: config
    }, (err, results) => {
      if (err) {
        return callback(err);
      }
      
      // 结果处理和排序
      this.processSearchResults(results, queryTerms, maxResults, callback);
    });
  }
  
  /**
   * 处理搜索结果，添加文档详情并排序
   */
  processSearchResults(mrResults, queryTerms, maxResults, callback) {
    if (!mrResults || !mrResults.length) {
      return callback(null, []);
    }
    
    // 获取文档元数据
    this.getDocumentDetails(Object.keys(mrResults), (err, docsMap) => {
      if (err) {
        return callback(err);
      }
      
      // 结合PageRank和其他分数
      this.addPageRankScores(mrResults, (err, scoredResults) => {
        if (err) {
          return callback(err);
        }
        
        // 创建最终结果列表
        const finalResults = [];
        
        // 排序结果(按分数降序)
        const sortedDocIds = Object.keys(scoredResults).sort((a, b) => {
          return scoredResults[b].finalScore - scoredResults[a].finalScore;
        });
        
        // 取前N个结果
        for (let i = 0; i < Math.min(maxResults, sortedDocIds.length); i++) {
          const docId = sortedDocIds[i];
          const score = scoredResults[docId];
          const docData = docsMap[docId] || {};
          
          // 创建结果摘要
          const snippet = this.createSnippet(
            docData.content || '', 
            queryTerms,
            200
          );
          
          finalResults.push({
            url: docId,
            title: docData.title || docId,
            snippet: snippet,
            score: score.finalScore
          });
        }
        
        callback(null, finalResults);
      });
    });
  }
  
  /**
   * 添加PageRank分数到搜索结果
   */
  addPageRankScores(results, callback) {
    const docIds = Object.keys(results);
    if (!docIds.length) {
      return callback(null, {});
    }
    
    // 批量获取PageRank分数
    this.getPageRankScores(docIds, (err, pageRanks) => {
      if (err) {
        // 如果无法获取PageRank，继续但仅使用TF-IDF分数
        console.error('Error fetching PageRank scores:', err);
        pageRanks = {};
      }
      
      // 合并分数
      const scoredResults = {};
      for (const docId of docIds) {
        const tfidfScore = results[docId].score || 0;
        const pageRank = pageRanks[docId] || 0;
        
        // 计算最终分数 = tfidf权重 * TF-IDF分数 + pageRank权重 * PageRank
        const finalScore = (this.config.tfidfWeight * tfidfScore) + 
                          (this.config.pageRankWeight * pageRank);
        
        scoredResults[docId] = {
          tfidfScore,
          pageRank,
          finalScore
        };
      }
      
      callback(null, scoredResults);
    });
  }
  
  /**
   * 获取文档详情
   */
  getDocumentDetails(docIds, callback) {
    if (!docIds.length) {
      return callback(null, {});
    }
    
    const docsMap = {};
    let pendingRequests = docIds.length;
    let hasError = false;
    
    // 查询每个文档的详细信息
    for (const docId of docIds) {
      global.distribution.all.store.get(`doc:${docId}`, (err, docData) => {
        pendingRequests--;
        
        if (err) {
          if (!hasError) {
            hasError = true;
            callback(err);
          }
          return;
        }
        
        if (docData) {
          docsMap[docId] = docData;
        }
        
        // 所有请求完成后回调
        if (pendingRequests === 0 && !hasError) {
          callback(null, docsMap);
        }
      });
    }
  }
  
  /**
   * 获取PageRank分数
   */
  getPageRankScores(urls, callback) {
    // 检查缓存
    const cacheKey = `pagerank:${urls.sort().join(',')}`;
    const cachedRanks = this.getCachedItem(cacheKey);
    
    if (cachedRanks) {
      return callback(null, cachedRanks);
    }
    
    // 批量获取PageRank分数
    global.distribution.all.store.get('pageranks', (err, allRanks) => {
      if (err || !allRanks) {
        return callback(null, {});
      }
      
      // 提取所需URL的PageRank
      const pageRanks = {};
      for (const url of urls) {
        pageRanks[url] = allRanks[url] || 0;
      }
      
      // 缓存结果
      this.setCachedItem(cacheKey, pageRanks);
      
      callback(null, pageRanks);
    });
  }
  
  /**
   * 预处理查询
   */
  preprocessQuery(query) {
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    // 转换为小写
    const lowerQuery = query.toLowerCase();
    
    // 移除标点符号并分词
    const words = lowerQuery.split(/\W+/).filter(word => word.length > 0);
    
    // 移除停用词
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 
      'to', 'for', 'with', 'by', 'about', 'as', 'of', 'is', 'are'
    ]);
    
    return words.filter(word => !stopWords.has(word) && word.length > 1);
  }
  
  /**
   * 创建包含查询词上下文的摘要
   */
  createSnippet(content, queryTerms, maxLength = 200) {
    if (!content || !queryTerms.length) {
      return '';
    }
    
    // 分割为句子
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
    if (!sentences.length) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    // 句子评分
    const scoredSentences = sentences.map(sentence => {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      for (const term of queryTerms) {
        // 为包含查询词的句子加分
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(lowerSentence)) {
          score += 1;
        }
      }
      
      return { sentence, score };
    });
    
    // 按分数排序
    scoredSentences.sort((a, b) => b.score - a.score);
    
    // 构建摘要
    let snippet = '';
    for (const { sentence, score } of scoredSentences) {
      if (score === 0) continue;
      
      if (snippet.length + sentence.length + 4 <= maxLength) {
        snippet += sentence + '. ';
      } else if (!snippet) {
        // 如果第一个句子太长
        snippet = sentence.substring(0, maxLength - 3) + '...';
        break;
      } else {
        break;
      }
    }
    
    // 如果没有匹配的句子，使用第一个句子
    if (!snippet) {
      snippet = sentences[0].substring(0, maxLength - 3) + '...';
    }
    
    return snippet;
  }
  
  /**
   * 获取健康状态
   */
  getHealthStatus(callback) {
    const status = {
      service: 'query',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {}
    };
    
    // 检查KV存储
    global.distribution.all.store.get('meta:total_docs', (err, totalDocs) => {
      status.components.kvStore = err ? 'unhealthy' : 'healthy';
      
      // 检查MapReduce服务
      global.distribution.all.status.get('heapUsed', (err, heapUsed) => {
        status.components.mapReduce = err ? 'unhealthy' : 'healthy';
        status.stats = this.stats;
        
        callback(status);
      });
    });
  }
  
  /**
   * 从缓存获取项目
   */
  getCachedItem(key) {
    const timestamp = this.cache.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.config.cacheExpiry) {
      return null;
    }
    
    return this.cache.items.get(key);
  }
  
  /**
   * 设置缓存项目
   */
  setCachedItem(key, value) {
    // 如果缓存已满，移除最旧的项目
    if (this.cache.items.size >= this.config.cacheSize) {
      let oldestKey = null;
      let oldestTime = Date.now();
      
      for (const [k, time] of this.cache.timestamps.entries()) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.items.delete(oldestKey);
        this.cache.timestamps.delete(oldestKey);
      }
    }
    
    this.cache.items.set(key, value);
    this.cache.timestamps.set(key, Date.now());
  }
}

/**
 * 初始化并启动分布式搜索查询服务
 */
function startDistributedSearchQuery(config = {}) {
  const query = new DistributedSearchQuery(config);
  query.start();
  return query;
}

module.exports = {
  DistributedSearchQuery,
  startDistributedSearchQuery
};