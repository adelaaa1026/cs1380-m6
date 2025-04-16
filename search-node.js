/**
 * search-node.js
 * 分布式搜索引擎查询节点服务器
 * 
 * 启动方式: node search-node.js [--port 8080] [--group search-group]
 */

const { DistributedSearchQuery } = require('./distribution/all/distributed-search-query');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: 8080,
    groupName: 'search-group',
    maxResults: 10,
    cacheSize: 1000,
    pageRankWeight: 0.5,
    debug: process.env.DEBUG === 'true'
  };
  
  // 解析参数
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
      config.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--group' && i + 1 < args.length) {
      config.groupName = args[i + 1];
      i++;
    } else if (args[i] === '--max-results' && i + 1 < args.length) {
      config.maxResults = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--cache-size' && i + 1 < args.length) {
      config.cacheSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--pagerank-weight' && i + 1 < args.length) {
      config.pageRankWeight = parseFloat(args[i + 1]);
      i++;
    }
  }
  
  return config;
}

// 初始化分布式系统环境
function setupDistributedSystem(config) {
  // 确保全局nodeConfig对象存在
  if (!global.nodeConfig) {
    // 设置节点配置
    global.nodeConfig = {
      ip: '127.0.0.1', // 可通过环境变量传入
      port: config.port,
      onStart: null
    };
    
    // 创建必要的全局变量
    global.moreStatus = {
      sid: '',
      nid: '',
      counts: 0
    };
    
    global.toLocal = {};
    
    // 初始化分布式系统的util模块
    global.distribution = {
      util: require('./distribution/util/util')
    };
  }

  // 启动本地节点
  const node = require('./distribution/local/node');
  
  return new Promise((resolve, reject) => {
    node.start((serverOrError) => {
      if (serverOrError instanceof Error) {
        console.error('Failed to start node:', serverOrError);
        reject(serverOrError);
      } else {
        console.log(`Node started on port ${global.nodeConfig.port}`);
        resolve(serverOrError);
      }
    });
    
    // 设置启动完成后的回调
    global.nodeConfig.onStart = (server) => {
      // 将配置中的groupName保存到闭包中以便在回调中使用
      const groupToJoin = config.groupName;
      // 注册到search组
      joinSearchGroup(groupToJoin);
    };
  });
}

// 加入搜索组
function joinSearchGroup(groupName) {
  console.log(`Attempting to join search group: ${groupName}`);
  
  // 确保该组存在，如果不存在则创建
  global.distribution.local.groups.get(groupName, (err, group) => {
    if (err || !group) {
      // 创建新组
      global.distribution.local.groups.put(groupName, {}, (err) => {
        if (err) {
          console.error(`Failed to create group ${groupName}:`, err);
          return;
        }
        console.log(`Created new search group: ${groupName}`);
        addNodeToGroup(groupName);
      });
    } else {
      addNodeToGroup(groupName);
    }
  });
}

// 将当前节点添加到搜索组
function addNodeToGroup(groupName) {
  const currentNode = {
    ip: global.nodeConfig.ip,
    port: global.nodeConfig.port
  };
  
  global.distribution.local.groups.add(groupName, currentNode, (err) => {
    if (err) {
      console.error(`Failed to join group ${groupName}:`, err);
      return;
    }
    console.log(`Successfully joined search group: ${groupName}`);
    
    // 获取组成员
    global.distribution.local.groups.get(groupName, (err, nodes) => {
      if (err) {
        console.error('Failed to get group members:', err);
        return;
      }
      
      console.log(`Search group ${groupName} has ${Object.keys(nodes).length} members`);
    });
  });
}

// 当节点关闭时清理
function setupShutdown(queryInstance) {
  // 处理进程终止信号
  const shutdownHandler = () => {
    console.log('Shutting down query node...');
    
    // 停止查询服务
    if (queryInstance) {
      queryInstance.stop(() => {
        console.log('Query service stopped');
        
        // 关闭节点服务器
        if (global.distribution && global.distribution.node && global.distribution.node.server) {
          global.distribution.node.server.close(() => {
            console.log('Node server closed');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
    } else {
      process.exit(0);
    }
  };
  
  // 注册终止信号处理
  process.on('SIGINT', shutdownHandler);
  process.on('SIGTERM', shutdownHandler);
  
  console.log('Shutdown handlers registered');
}

/**
 * 主函数：启动搜索节点
 */
async function main() {
  try {
    console.log('Initializing distributed search node...');
    
    // 解析配置
    const config = parseArgs();
    
    // 设置分布式系统
    await setupDistributedSystem(config);
    
    // 初始化并启动查询服务
    console.log('Starting distributed search query with config:', config);
    const queryInstance = new DistributedSearchQuery(config);
    
    // 注册清理函数
    setupShutdown(queryInstance);
    
    console.log('Distributed search node ready');
    
    // 创建状态报告任务
    setInterval(() => {
      const stats = queryInstance.stats;
      console.log('--- Query Stats Report ---');
      console.log(`Total Queries: ${stats.totalQueries}`);
      console.log(`Cache Hits/Misses: ${stats.cacheHits}/${stats.cacheMisses}`);
      console.log(`Failed Queries: ${stats.failedQueries}`);
      console.log(`Avg Query Time: ${stats.avgQueryTime.toFixed(2)}ms`);
      console.log('------------------------');
    }, 60000);  // 每分钟报告一次
    
  } catch (error) {
    console.error('Failed to start search node:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动搜索节点
if (require.main === module) {
  main();
}

module.exports = { setupDistributedSystem, joinSearchGroup, main };