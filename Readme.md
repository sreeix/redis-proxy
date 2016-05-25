Redis-proxy
=============

It's like haproxy except for redis. 

*This is a dead project, please look at twemproxy or redis sentinal*
Why RedisProxy?

Typically for every redis server we setup, we have a backup server setup as a slave of the main server.

If the Active Redis crashes or goes down for maintenance, we want the application to seamlessly use (read/write) data from the backup server. This can easily be done by making the backup server 'slaveof no one'
But the problem is once the backup takes over as active new writes will go there. Now if the "original master" comes back up it will be out of sync with the "current master", so it has to be slaved to the "current master" before it is ready to start take requests.

This is solved by redis-proxy, which proxies the active redis. 
It is also smart enough to issue slave of commands to machines that start up and make masters slave of no one. It also can optionally provide for reads-write splitting. i.e. Reads going to slaves, and Writes only going to master.

This reduces the common redis slave master replication dance that needs to be done when bad stuff happens or maintenance of the servers are needed

Features
============

* Server Monitoring (to track masters and slaves)
* Automatic slave upgrade on master failure
* Connection Pooling
* Supports Pipelining
* Honors Existing Master Slave Configurations( ie. if the  masters and slaves are already setup then it will maintain the same configuration, instead of largescale movement of data)
* Read write Splitting. It is available for testing, but not published to npm.
   * Turn it on by adding mode: "readsToSlaves" in the configuration(default is allToMaster)
   * If there are multiple slaves, a round robin strategy is used.
   * It lets standard non mutating commands go to the slaves( instead of the master). This will almost always improve the throughput of the cluster of Redis servers.
   * Mutating commands always go to Master.
   * Unknown commands (Renamed via the redis config) will go to the Master.


![Typical setup!](http://github.com/sreeix/redis-proxy/raw/master/docs/Typical_Setup.jpg)

Image courtesy  Marlon Li([Marlon Li](https://github.com/atrun)) represents how it is being or can be used.


Configuration
==============

The redis-proxy uses the config file to figure out the details of the redis cluster, The configurations are documented in the [Config settings](https://github.com/sreeix/redis-proxy/blob/master/config/configuration.md)

Disclaimer
=============

We are in the process of testing it, it works for simple commands, but i have not tested and validated it against the whole set of redis commands. It is likely that commands like Pub sub don't work correctly(or at all).

Install
=========

From NPM 
---------
Node.js and NPM are prerequistes. [Here is the link to install both.](https://github.com/joyent/node/wiki/Installation)


* `npm install -g redis-proxy`

* `redis-proxy <path to config.json>`


From Source
-------------

* `git clone git@github.com:sreeix/redis-proxy.git`

* `npm install`

* `Modify the config/config.json`

* `npm start`
 
Scenarios
============

The standard scenario is each redis has a backup redis.

* R1 backed by R2
* R1 is slave of no one.
* R2 is slave of R1
* R1 Goes down
  * We issue Slave of no one to R2
  * Make R2 the active redis
* R1 Comes up.
  * We issue Slave of R2 to R1
  * R2 is still the active server
* R2  Goes down
  * We make R1 Slave of no one
  * R1 is now  the active redis.


If Both of them go down together, We just return errors and wait for one of them to come back on.

There can be only one master in the system. This is true even if multiple redis-proxies are monitoring the cluster.

There can be multiple slaves. Each will become slave of the master, and on master doing down, one of the slave it randomly picked as master.


Redis-Proxy Stability
==================

Redis proxy can become a single point of failure, If it goes down your redis servers will become inaccessible. There are 2 possible setups

*  Using Nodemon/Forever to keep the redis proxy up all the time

*  Have a backup redis-proxy on Elastic IP or Virtual IP and switch manually or using keepalived. 
    Note, however, that this is not a distributed system (like redis-sentinel). The choice of the redis server to be used is consistent. i.e if a proxy picks up the fact that master is down, then it would promote the highest slave (by runid) to master consistently.


Limitations / TODOS
===================

* Benchmarks show  about 3x drop in performance(Investigating it and will post a fix soon)

* No support for Monitoring & pub/sub commands( There is no reason why this can't be supported)

* Would be nice to have a small ui for showing errors and status of redis servers.

* It currently only works as master/slave mode. And it's highly unlikely that there could be a switch to sharded mode.

* No downtime adding and removing slaves


