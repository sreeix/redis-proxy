Redis-proxy
=============

It's like haproxy except for redis. 


Why RedisProxy?

Typically for every redis server we setup we have a backup server setup as a slave of the main server. 

If the Active Redis crashes or goes down for maintenance, we want the application to seamlessly use(read/write) data from the backup server. But the problem is once the backup takes over as active it will be out of sync with the original(master) and should become the sale of the current active. This is solved by redis-proxy, which proxies the active redis. It is also smart enough to issue slave of commands to machines that start up and make masters slave of no one. 

This reduces the common redis slave master replication dance that needs to be done when bad stuff happens or needs maintenance

Disclaimer
=============

We are in the process of testing it, it works for simple commands, but i have not tested and validated it against the whole set of redis commands. It is likely that commands like Monitor/Pub sub is not working correctly(or at all).

Please consider this alpha software. All help and pull requests/ ideas are appreciated. 


Install
=========

Install via npm module install

    git clone git@github.com:sreeix/redis-proxy.git
 
    Modify the config.json
 
    node server.js
 
 
Unfortunately I have had to make minor modifications to node-redis to support raw commands to redis, so it can't be published to npm as yet.

Scenarios
============

The standard scenario is each redis has a backup redis.

* R1 backed by R2
* R1 is slave of no one.
* R2 is slave of R1

* R1 Goes down
  ** We issue Slave of no one to R2
  ** Make R2 the active redis

* R1 Comes up.
  * We issue Slave of R2 to R1
  * R2 is still the active server

* R2  Goes down
  * We make R1 Slave of no one
  * R1 is now  the active redis.

If Both of them go down together, We just return errors and wait for one of them to come back on.

If no redis is available at startup we raise an exception and stop. (This will change for sure.)

There can be only one master in the system.

There can be multiple slaves. Each will become slave of the master, and on master doing down, one of the slave it randomly picked as master.


Limitations
============
