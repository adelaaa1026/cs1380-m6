/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

 

test('(1 pts) student test', (done) => {
  // null key with multiple puts
  const users = [
    {first: 'cs1380a', last: 'cs2380a'},
    {first: 'cs1380b', last: 'cs2380b'},
    {first: 'cs1380c', last: 'cs2380c'}
  ];

  distribution.group1.mem.put(users[0], null, (e, v1) => {
    distribution.group1.mem.put(users[1], null, (e, v2) => {
      distribution.group1.mem.put(users[2], null, (e, v3) => {
        distribution.group1.mem.get(null, (e, keys) => {
          try {
            expect(e).toEqual({});
            expect(keys).toContain(id.getID(users[0]));
            expect(keys).toContain(id.getID(users[1]));
            expect(keys).toContain(id.getID(users[2]));
            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });
  });
});

test('(1 pts) student test', (done) => {
  //  large object
  const largeUser = {
    first: 'cs1380a',
    last: 'cs2380a',
    data: Array(1000).fill('test data')
  };
  const key = 'yayy';

  distribution.group3.mem.put(largeUser, key, (e, v) => {
    distribution.group3.mem.get(key, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(largeUser);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // store with concurrent operations
  const user = {first: 'cs1380a', last: 'cs2380a'};
  const key = 'lalala';

  distribution.group2.store.put(user, key, (e, v) => {
    distribution.group2.store.get(key, (e1, v1) => {
      distribution.group2.store.del(key, (e2, v2) => {
        distribution.group2.store.get(key, (e3, v3) => {
          try {
            expect(e1).toBeFalsy();
            expect(v1).toEqual(user);
            expect(e2).toBeFalsy();
            expect(v2).toEqual(user);
            expect(e3).toBeInstanceOf(Error);
            expect(v3).toBeFalsy();
            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });
  });
});

test('(1 pts) student test', (done) => {
  //  hash function verification
  const user = {first: 'cs1380a', last: 'cs2380a'};
  const key = 'lala';
  const kid = id.getID(key);
  const nodes = Object.values(group1Group);
  const nids = nodes.map(node => id.getNID(node));

  distribution.group1.mem.put(user, key, (e, v) => {
    const targetNid = id.naiveHash(kid, nids);
    const targetNode = nodes.find(node => id.getNID(node) === targetNid);
    
    const remote = {
      node: targetNode,
      service: 'mem',
      method: 'get'
    };
    const message = [{key: key, gid: 'group1'}];

    distribution.local.comm.send(message, remote, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(user);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  //cross-group access between mem services
  const user = {first: 'cs1380', last: 'cs2380'};
  const key = 'kkkk';

  distribution.group1.mem.put(user, key, (e, v) => {
    distribution.group2.mem.get(key, (e, v) => {
      try {
        expect(e).toBeInstanceOf(Error);
        expect(v).toBeFalsy();
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  //  store service with empty group
  const emptyGroupConfig = {gid: 'emptygroup'};
  const emptyGroup = {};

  distribution.local.groups.put(emptyGroupConfig, emptyGroup, (e, v) => {
    distribution.emptygroup.store.get('anykey', (e, v) => {
      try {
        expect(e).toBeInstanceOf(Error);
        expect(v).toBeFalsy();
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

 

test('(1 pts) student test', (done) => {
  // multiple deletes
  const user = {first: 'cs1380a', last: 'cs2380a'};
  const key = 'lala';

  distribution.group2.store.put(user, key, (e, v) => {
    distribution.group2.store.del(key, (e1, v1) => {
      distribution.group2.store.del(key, (e2, v2) => {
        try {
          expect(e1).toBeFalsy();
          expect(v1).toEqual(user);
          expect(e2).toBeInstanceOf(Error);
          expect(v2).toBeFalsy();
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});


test('(1 pts) student test', (done) => {
  // special characters in key
  const user = {first: 'cs1380a', last: 'cs2380a'};
  const key = 'lalala**^&&&*()';

  distribution.group1.store.put(user, key, (e, v) => {
    distribution.group1.store.get(key, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(user);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});
 
const group1Group = {};
const group2Group = {};
const group3Group = {};

let localServer = null;

const n1 = {ip: '127.0.0.1', port: 7001};
const n2 = {ip: '127.0.0.1', port: 7002};
const n3 = {ip: '127.0.0.1', port: 7003};
const n4 = {ip: '127.0.0.1', port: 7004};
const n5 = {ip: '127.0.0.1', port: 7005};

beforeAll((done) => {
  const remote = {service: 'status', method: 'stop'};

  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n5;
          distribution.local.comm.send([], remote, (e, v) => {
            startNodes();
          });
        });
      });
    });
  });

  const startNodes = () => {
    group1Group[id.getSID(n1)] = n1;
    group1Group[id.getSID(n2)] = n2;

    group2Group[id.getSID(n2)] = n2;
    group2Group[id.getSID(n3)] = n3;
    group2Group[id.getSID(n4)] = n4;

    group3Group[id.getSID(n3)] = n3;
    group3Group[id.getSID(n4)] = n4;
    group3Group[id.getSID(n5)] = n5;

    distribution.node.start((server) => {
      localServer = server;

      const group1Config = {gid: 'group1', hash: id.naiveHash};
      const group2Config = {gid: 'group2', hash: id.consistentHash};
      const group3Config = {gid: 'group3', hash: id.rendezvousHash};

      distribution.local.groups.put(group1Config, group1Group, (e, v) => {
        distribution.local.groups.put(group2Config, group2Group, (e, v) => {
          distribution.local.groups.put(group3Config, group3Group, (e, v) => {
            distribution.local.status.spawn(n1, (e, v) => {
              distribution.local.status.spawn(n2, (e, v) => {
                distribution.local.status.spawn(n3, (e, v) => {
                  distribution.local.status.spawn(n4, (e, v) => {
                    distribution.local.status.spawn(n5, (e, v) => {
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
  };
});

afterAll((done) => {
  const remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n5;
          distribution.local.comm.send([], remote, (e, v) => {
            localServer.close();
            done();
          });
        });
      });
    });
  });
});
