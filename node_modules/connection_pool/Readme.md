Connection Pool
================

This provides a simple connection pool for node.js applications to use for managing connections to servers.

It is used in [redis-proxy](https://github.com/sreeix/redis-proxy) for pooling redis connections.


It does not LRU or release stale connections. 

That may be something we can build in, but right now the API expects connections to be taken and released correctly, otherwise we will end up with unused connections

The API is very simple currently and is used as following


Creation
---------

`var Pool = require('connection_pool')`

` var p = new Pool({maxSize: 100, delayCreation:false, growBy: 2})`

Following options are available:

`create` : takes a function that invokes a callback (err, conn) . This is _Mandatory_

maxSize`` : Maximum connections on the pool : default 20

startSize : stars with these many connections: default 1/3 of max connections(6 if not maxSize is not specified)

growBy : how to grow the pool default to 1/3 of max connections

delayCreation: Create only on use rather than preemptively. This may mean a slight initial pool creation expense.

close : optional close function to be called after release for doing cleanups


Taking Connections
------------------

`p.take('some_identifier', function(err, connection){
  doSomething();
})`


Releasing Connections
---------------------

`p.close(identifier)`

or 

`p.closeAll()`

or 

`p.release(connection)`


Stats
--------

It exposes the following basic information

`totalConnections` : The current total connections in the pool. Note that this may not be the maxSize, because the pool size may be grown later

`totalFreeConnections` : show how many more connections are available in the pool

`totalInUseConnections` Show the total connections currently being used.