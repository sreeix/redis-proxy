Redis-proxy
=============

It's like haproxy except for redis. 


Why RedisProxy?

Typically for every redis server we setup we have a backup server setup as a slave of the main server. 

If the Active Redis crashes or goes down for maintenance, we want the application to seamlessly use(read/write) data from the backup server. But the problem is once the backup takes over as active it will be out of sync with the original(master) and should become the sale of the current active. This is solved by redis-proxy, which proxies the active redis. It is also smart enough to issue slave of commands to machines that start up and make masters slave of no one. 

This reduces the common redis slave master replication dance that needs to be done when bad stuff happens or needs maintenance


Install
=========

Install via npm module install

    git clone git@github.com:sreeix/redis-proxy.git
 
    Modify the config.json
 
    node server.js
 
 
 Unfortunately I have had to make minor modifications to node-redis to support raw commands to redis, so it can't be published to npm as yet.



