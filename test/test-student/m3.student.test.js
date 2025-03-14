
const distribution = require('../../config.js');
const id = distribution.util.id;
const local = distribution.local;
const config = distribution.node.config;


test('(1 pts) student test', (done) => {

  const g = {
    'distributed': {ip: '127.0.0.1', port: 8080},
    'systems': {ip: '127.0.0.1', port: 8081},
  };

  distribution.group4.groups.put('cs1380', g, (e, v) => {
    try {
      expect(e).toEqual({});
      Object.keys(group4Group).forEach((sid) => {
        expect(v[sid]).toEqual(g);
      });
      done();
    } catch (error) {
      done(error);
    }
  });
});


test('(1 pts) student test', (done) => {
  const g = {
    'distributed': {ip: '127.0.0.1', port: 8080},
    'systems': {ip: '127.0.0.1', port: 8081},
  };

  distribution.group4.groups.put('cs1380gd', g, (e, v) => {
    distribution.group4.groups.get('cs1380gd', (e, v) => {
      distribution.group4.groups.del('cs1380gd', (e, v) => {
        try {
          expect(e).toEqual({});
          Object.keys(group4Group).forEach((sid) => {
            expect(v[sid]).toEqual(g);
          });
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});

test('(1 pts) student test', (done) => {
  const nids = Object.values(mygroupGroup).map((node) => id.getNID(node));
  const remote = {service: 'status', method: 'get'};

  distribution.mygroup.comm.send(['nid'], remote, (e, v) => {
    expect(e).toEqual({});
    try {
      expect(Object.values(v).length).toBe(nids.length);
      expect(Object.values(v)).toEqual(expect.arrayContaining(nids));
      done();
    } catch (error) {
      done(error);
    }
  });
});

test('(1 pts) student test', (done) => {
  local.status.get('sid', (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBe(id.getSID(config));
      done();
    } catch (error) {
      done(error);
    }
  });
});

test('(1 pts) student test', (done) => {
  const g = {
    'al57j': {ip: '127.0.0.1', port: 8082},
    'q5mn8': {ip: '127.0.0.1', port: 8083},
  };

  local.groups.put('atlas', g, (e, v) => {
    const n2 = {ip: '127.0.0.1', port: 8084};

    local.groups.add('atlas', n2);

    const expectedGroup = {
      ...g, ...{[id.getSID(n2)]: n2},
    };

    local.groups.get('atlas', (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(expectedGroup);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  const g = {
    'yayy': {ip: '127.0.0.1', port: 8082},
    'lalala': {ip: '127.0.0.1', port: 8083},
  };

  local.groups.put('atlas', g, (e, v) => {
    local.groups.rem('atlas', 'lalala');

    const expectedGroup = {
      'yayy': {ip: '127.0.0.1', port: 8082},
    };

    local.groups.get('atlas', (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v).toEqual(expectedGroup);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});


 
/* Infrastructure for the tests */

// This group is used for testing most of the functionality
const mygroupGroup = {};
// These groups are used for testing hashing
const group1Group = {};
const group2Group = {};
const group4Group = {};
const group3Group = {};

/*
   This hack is necessary since we can not
   gracefully stop the local listening node.
   This is because the process that node is
   running in is the actual jest process
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 8000};
const n2 = {ip: '127.0.0.1', port: 8001};
const n3 = {ip: '127.0.0.1', port: 8002};
const n4 = {ip: '127.0.0.1', port: 8003};
const n5 = {ip: '127.0.0.1', port: 8004};
const n6 = {ip: '127.0.0.1', port: 8005};


beforeAll((done) => {
  // First, stop the nodes if they are running
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
            remote.node = n6;
            distribution.local.comm.send([], remote, (e, v) => {
            });
          });
        });
      });
    });
  });

  mygroupGroup[id.getSID(n1)] = n1;
  mygroupGroup[id.getSID(n2)] = n2;
  mygroupGroup[id.getSID(n3)] = n3;

  group1Group[id.getSID(n4)] = n4;
  group1Group[id.getSID(n5)] = n5;
  group1Group[id.getSID(n6)] = n6;

  group4Group[id.getSID(n1)] = n1;
  group4Group[id.getSID(n3)] = n3;
  group4Group[id.getSID(n5)] = n5;

  group3Group[id.getSID(n2)] = n2;
  group3Group[id.getSID(n4)] = n4;
  group3Group[id.getSID(n6)] = n6;

  group4Group[id.getSID(n1)] = n1;
  group4Group[id.getSID(n2)] = n2;
  group4Group[id.getSID(n4)] = n4;

  // Now, start the base listening node
  distribution.node.start((server) => {
    localServer = server;

    const groupInstantiation = (e, v) => {
      const mygroupConfig = {gid: 'mygroup'};
      const group1Config = {gid: 'group1', hash: id.naiveHash};
      const group2Config = {gid: 'group2', hash: id.consistentHash};
      const group3Config = {gid: 'group3', hash: id.rendezvousHash};
      const group4Config = {gid: 'group4'};

      // Create some groups
      distribution.local.groups
          .put(mygroupConfig, mygroupGroup, (e, v) => {
            distribution.local.groups
                .put(group1Config, group1Group, (e, v) => {
                  distribution.local.groups
                      .put(group2Config, group2Group, (e, v) => {
                        distribution.local.groups
                            .put(group3Config, group3Group, (e, v) => {
                              distribution.local.groups
                                  .put(group4Config, group4Group, (e, v) => {
                                    done();
                                  });
                            });
                      });
                });
          });
    };

    // Start the nodes
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          distribution.local.status.spawn(n4, (e, v) => {
            distribution.local.status.spawn(n5, (e, v) => {
              distribution.local.status.spawn(n6, groupInstantiation);
            });
          });
        });
      });
    });
  });
});

afterAll((done) => {
  distribution.mygroup.status.stop((e, v) => {
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
              remote.node = n6;
              distribution.local.comm.send([], remote, (e, v) => {
                localServer.close();
                done();
              });
            });
          });
        });
      });
    });
  });
});
