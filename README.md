# distribution

This is the distribution library. When loaded, distribution introduces functionality supporting the distributed execution of programs. To download it:

## Installation

```sh
$ npm i '@brown-ds/distribution'
```

This command downloads and installs the distribution library.

## Testing

There are several categories of tests:
  *	Regular Tests (`*.test.js`)
  *	Scenario Tests (`*.scenario.js`)
  *	Extra Credit Tests (`*.extra.test.js`)

### Running Tests

By default, all regular tests are run. Use the options below to run different sets of tests:

1. Run all regular tests (default): `$ npm test` or `$ npm test -- -t`
2. Run scenario tests: `$ npm test -- -c` 
3. Run extra credit tests: `$ npm test -- -ec`
4. Run the `non-distribution` tests: `$ npm test -- -nd`
5. Combine options: `$ npm test -- -c -ec -nd -t`

## Usage

To import the library, be it in a JavaScript file or on the interactive console, run:

```js
let distribution = require("@brown-ds/distribution");
```

Now you have access to the full distribution library. You can start off by serializing some values. 

```js
let s = distribution.util.serialize(1); // '{"type":"number","value":"1"}'
let n = distribution.util.deserialize(s); // 1
```

You can inspect information about the current node (for example its `sid`) by running:

```js
distribution.local.status.get('sid', console.log); // 8cf1b
```

You can also store and retrieve values from the local memory:

```js
distribution.local.mem.put({name: 'nikos'}, 'key', console.log); // {name: 'nikos'}
distribution.local.mem.get('key', console.log); // {name: 'nikos'}
```

You can also spawn a new node:

```js
let node = { ip: '127.0.0.1', port: 8080 };
distribution.local.status.spawn(node, console.log);
```

Using the `distribution.all` set of services will allow you to act 
on the full set of nodes created as if they were a single one.

```js
distribution.all.status.get('sid', console.log); // { '8cf1b': '8cf1b', '8cf1c': '8cf1c' }
```

You can also send messages to other nodes:

```js
distribution.all.comm.send(['sid'], {node: node, service: 'status', method: 'get'}, console.log); // 8cf1c
```


# Results and Reflection
# M1: Serialization / Deserialization
## Summary
> Summarize your implementation, including key challenges you encountered.

My implementation comprises one software components (serialization), totaling 200 lines of code. Key challenges included:
1. deserializing functions: I looked up StackOverflow for help and experimented with different approaches outlined there, and found that the best approach was to use the `new Function` constructor to create a new function from the serialized string.
2. discovering root objects dynamically: after hardcoding the native modules to serialize them, I struggled a bit to come up with a way to 
dynamically discover the root objects. but after looking into "process.binding('natives')" I found a way to do it.

## Correctness & Performance Characterization
> Describe how you characterized the correctness and performance of your
implementation
*Correctness*: I wrote 16 tests; these tests take 1.021s to
execute. This includes objects with primitive types,functions, dates, errors, and complex structures like cycles and native modules. 
*Performance*: The latency of various subsystems is described in the
`"latency"` portion of package.json. The characteristics of my development
machines are summarized in the `"dev"` portion of package.json.



# M2: Actors and Remote Procedure Calls (RPC)
## Summary
> Summarize your implementation, including key challenges you encountered.
Remember to update the `report` section of the `package.json` file with the
total number of hours it took you to complete each task of M2 (`hours`) and
the lines of code per task.
My implementation comprises 4 software components, totaling
250 lines of code. Key challenges included:
1. when implementing comm, knowing how to send the message to the server node.
2. when implementing rpc, debugging a timeout error. It turns out the test suite
wasn't working, and I fixed it by pulling the update from the stencil code.

## Correctness & Performance Characterization
> Describe how you characterized the correctness and performance of your
implementation
*Correctness*: I wrote 5 tests; these tests take 1.967s to
execute.
*Performance*: I characterized the performance of comm and RPC by sending
1000 service requests in a tight loop. Average throughput and latency is
recorded in `package.json`.
## Key Feature
> How would you explain the implementation of `createRPC` to someone who has
no background in computer science — i.e., with the minimum jargon possible?

Imagine you want to eat fried chicken but you don't know how to cook it. You know a friend who's 
really good at cooking fried chicken. He likes cooking so much that he can cook it whenever you 
want. To make ordering easier, he sets up a digital ordering panel in your kitchen. Whenever you 
want fried chicken, you simply place an order through the panel and specify the flavor and portion 
size. Then fried chicken will be delivered to your kitchen as if you cooked it yourself. 

The function createRPC essentially helps to create the ordering panel, which allows you to order a 
dish from a remote kitchen.


# M3: Node Groups & Gossip Protocols
## Summary
> Summarize your implementation, including key challenges you encountered.
Remember to update the `report` section of the `package.json` file with the
total number of hours it took you to complete each task of M3 (`hours`) and
the lines of code per task.
My implementation comprises 5 new software components, totaling
400 added lines of code over the previous implementation. Key
challenges included
1. it took me a while to implement all/comm, because I only had a vague idea of 
the program flow.
2. it also took me a long time to debug error related callback, because
there's a long error propagation chain, and I had to be careful about
passing the Error object and error message, and aggregating error information
from all group nodes. 

## Correctness & Performance Characterization
> Describe how you characterized the correctness and performance of your
implementation
*Correctness* -- 6 tests, 3.735s
*Performance* -- spawn times (all students) and gossip (lab/ec-only).
## Key Feature
> What is the point of having a gossip protocol? Why doesn't a node just send
the message to _all_ other nodes in its group?

Sending the message to all other nodes is probably more reliable but it's
terribly inefficient. Gossip protocol improves efficiency by spreading the
message to a few nodes, who then spread it to even more nodes, and so on.



# M4: Distributed Storage
## Summary
> Summarize your implementation, including key challenges you encountered
Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M4 (`hours`) and the lines of code per task.

My implementation mainly have five parts: mem/store for local storage, mem/store for group storage, and reconf. For local storage, mem and store store key-value pairs for a single node. For group storage, mem and store use a specified hash function to find a node from the group to store the key-value pair. The reconf method is used to relocate objects to the correct nodes when the group changes.

## Correctness & Performance Characterization
> Describe how you characterized the correctness and performance of your implementation
*Correctness* -- I implemented 9 tests, and they take 8.388s to execute.
*Performance* -- insertion and retrieval.

## Key Feature
> Why is the `reconf` method designed to first identify all the keys to be relocated and then relocate individual objects instead of fetching all the objects immediately and then pushing them to their corresponding locations?

Because fetching all the objects and pushing them to their new locations is extremely expensive. This means transferring all objects over the network every time we reconfigure the group. On the other hand, identifying only the keys that need to be relocated is much cheaper. Instead of blindly transferring all objects, we first determine which ones actually need to move by computing their new placements.