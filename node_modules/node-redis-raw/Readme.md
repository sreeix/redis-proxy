Redis Raw Mode
===============

This package monkey patches [node-redis](https://github.com/mranney/node_redis) to support writing raw commands to Redis. This is extremely useful in cases when you want to work with the native [redis command protocol](http://redis.io/topics/protocol), without invoking the penalties for parsing the commands.

Useful for low level applications like proxies. It is use in the [Redis-Proxy](https://github.com/sreeix/redis-proxy).

Usage
======

`require('raw-redis')`

The only public API it adds to the redis client API is `sendRaw`

It is used as following

`var r = require('redis')`

`var cl = r.createClient()`

`cl.sendRaw("*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n", function(err, res) {console.log(res);});`


