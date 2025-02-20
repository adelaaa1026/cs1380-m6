const distribution = require('../config.js');
const id = distribution.util.id;

const mygroupConfig = {gid: 'mygroup'};
const mygroupGroup = {};

/*
   This is necessary since we can not
   gracefully stop the local listening node.
   This is because the process that node is
   running in is the actual jest process
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 9001};
const n2 = {ip: '127.0.0.1', port: 9002};
const n3 = {ip: '127.0.0.1', port: 9003};
const n4 = {ip: '127.0.0.1', port: 9004};
const n5 = {ip: '127.0.0.1', port: 9005};
const n6 = {ip: '127.0.0.1', port: 9006};

// jest.setTimeout(5000); 

test('(2 pts) all.comm.send(status.get(nid))', (done) => {
  console.log('Starting test');
  const nids = Object.values(mygroupGroup).map((node) => id.getNID(node));
  const remote = {service: 'status', method: 'get'};
  console.log('Sending request');
  distribution.mygroup.comm.send(['nid'], remote, (e, v) => {
    expect(e).toEqual({});
    console.log('Received response v: ', v);
    try {
      expect(Object.values(v).length).toBe(nids.length);
      expect(Object.values(v)).toEqual(expect.arrayContaining(nids));
      done();
    } catch (error) {
      done(error);
    }
  });
});

test('(2 pts) local.comm.send(all.status.get(nid))', (done) => {
  const nids = Object.values(mygroupGroup).map((node) => id.getNID(node));
  const remote = {node: n5, service: 'groups', method: 'put'};

  console.log('[test] Registering group on n5. Group members:', {
    config: mygroupConfig,
    group: Object.keys(mygroupGroup).map(sid => ({
      sid,
      node: mygroupGroup[sid]
    }))
  });

  // first register mygroup on n5
  distribution.local.comm.send([mygroupConfig, mygroupGroup], remote, (e, v) => {
    console.log('[test] Group registration response:', { error: e, value: v });
    
    const remote = {node: n5, gid: 'mygroup', service: 'status', method: 'get'};
    console.log('[test] Sending status.get request to n5');

    // from local node, run mygroup.status.get() on n5 via send()
    distribution.local.comm.send(['nid'], remote, (e, v) => {
      console.log('[test] Status.get response:', { error: e, value: v });
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
});

test('(2 pts) all.comm.send(status.get(random))', (done) => {
  const remote = {service: 'status', method: 'get'};

  distribution.mygroup.comm.send(['random'], remote, (e, v) => {
    try {
      Object.keys(mygroupGroup).forEach((sid) => {
        console.log("This is the error: ", e, sid);
        expect(e[sid]).toBeDefined();
        expect(e[sid]).toBeInstanceOf(Error);
        expect(v).toEqual({});
      });

      done();
    } catch (error) {
      done(error);
    }
  });
});

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
              startNodes();
            });
          });
        });
      });
    });
  });

  const startNodes = () => {
    console.log('Starting nodes');
    mygroupGroup[id.getSID(n1)] = n1;
    mygroupGroup[id.getSID(n2)] = n2;
    mygroupGroup[id.getSID(n3)] = n3;
    mygroupGroup[id.getSID(n4)] = n4;
    mygroupGroup[id.getSID(n5)] = n5;

    const groupInstantiation = () => {
        console.log('Group instantiation');
        // Create the groups
        distribution.local.groups.put(mygroupConfig, mygroupGroup, (e, v) => {
            if (e) {
                console.error('Failed to create group:', e);
                done(e);
                return;
            }
            console.log('Group created successfully, services initialized');
            // Verify services are created
            if (!distribution.mygroup || !distribution.mygroup.comm) {
                done(new Error('Group services not properly initialized'));
                return;
            }
            done();
        });
    };

    // Now, start the nodes listening node
    distribution.node.start((server) => {
      localServer = server;

      // Start the nodes
      distribution.local.status.spawn(n1, (e, v) => {
        distribution.local.status.spawn(n2, (e, v) => {
          distribution.local.status.spawn(n3, (e, v) => {
            distribution.local.status.spawn(n4, (e, v) => {
              distribution.local.status.spawn(n5, (e, v) => {
                distribution.local.status.spawn(n6, (e, v) => {
                  groupInstantiation();
                });
              });
            });
          });
        });
      });
    }); ;
  };
  console.log('Starting nodes finished');
});

afterAll((done) => {
    const stopNode = (node) => new Promise((resolve) => {
        const remote = {service: 'status', method: 'stop', node};
        distribution.local.comm.send([], remote, () => resolve());
    });

    // Stop all nodes in sequence
    Promise.all([
        stopNode(n1),
        stopNode(n2),
        stopNode(n3),
        stopNode(n4),
        stopNode(n5),
        stopNode(n6)
    ]).then(() => {
        // Close local server after all nodes are stopped
        if (localServer) {
            localServer.close(() => {
                // Give a small delay for cleanup
                setTimeout(() => done(), 100);
            });
        } else {
            setTimeout(() => done(), 100);
        }
    });
});
