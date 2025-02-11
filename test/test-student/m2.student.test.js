/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const { send } = require('../../distribution/local/comm');
const http = require('http');

// Add server setup and cleanup
let server;

beforeAll((done) => {
  distribution.node.start((srv) => {
    server = srv;
    done();
  });
});

afterAll((done) => {
  if (server) {
    server.close(done);
  } else {
    done();
  }
});

test('(1 pts) student test', (done) => {
  // status: get node ID
  distribution.local.status.get('nid', (err, nodeId) => {
    expect(err).toBeNull();
    expect(nodeId).toBe(global.moreStatus.nid);
    done();
  });
});

test('(1 pts) student test', (done) => {
  // status: get service ID
  distribution.local.status.get('sid', (err, serviceId) => {
    expect(err).toBeNull();
    expect(serviceId).toBe(global.moreStatus.sid);
    done();
  });
});

test('(1 pts) student test', (done) => {
  // routes: add and retrieve a service
  const serviceName = 'testService';
  const serviceFunction = jest.fn();

  distribution.local.routes.put(serviceFunction, serviceName, (err) => {
    expect(err).toBeNull();

    distribution.local.routes.get(serviceName, (err, retrievedFunction) => {
      expect(err).toBeNull();
      expect(retrievedFunction).toBe(serviceFunction);
      done();
    });
  });
});

test('(1 pts) student test', (done) => {
  //  routes: retrieve a non-existent service
  distribution.local.routes.get('nonExistentService', (err, service) => {
    expect(err).toBeTruthy();
    expect(service).toBeUndefined();
    done();
  });
});

test('(1 pts) student test', (done) => {
  // comm: valid configuration
  const message = ['a', 'b'];
  const remote = {
    node: { ip: global.nodeConfig.ip, port: global.nodeConfig.port },
    service: 'testService',
    method: 'testMethod',
    gid: global.moreStatus.nid
  };

  const testService = {
    testMethod: function() {
      const callback = arguments[arguments.length - 1];
      const args = Array.prototype.slice.call(arguments, 0, -1);
      callback(null, 'success');
    }
  };

  distribution.local.routes.put(testService, 'testService', (err) => {
    expect(err).toBeNull();
    
    send(message, remote, (err, value) => {
      expect(err).toBeNull();
      expect(value).toBeDefined();
      done();
    });
  });
});

test('(1 pts) student test', (done) => {
  // comm: invalid configuration
  send([], { node: null, service: '', method: '' }, (err, value) => {
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('The remote node is invalid');
    expect(value).toBeNull();
    done();
  });
});

test('(1 pts) student test', (done) => {
  // comm: server error when service is not found
  const message = ['a', 'b'];
  const remote = {
    node: { ip: global.nodeConfig.ip, port: global.nodeConfig.port },
    service: 'nonExistentService',
    method: 'testMethod',
    gid: global.moreStatus.nid
  };

  send(message, remote, (err, value) => {
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Service not found');
    expect(value).toBeNull();
    done();
  });
});
