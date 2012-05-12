var _ = require('underscore');

// info is a tricky command to send to slave, so till we figure out how to handle info, we send it it master
var readOnlyCommands = ['smembers', 'hlen', 'hmget', 'srandmember', 'hvals', 'randomkey', 'strlen',
                        'dbsize', 'keys', 'ttl', 'lindex', 'type', 'llen', 'dump', 'scard', 'echo', 'lrange',
                        'zcount', 'exists', 'sdiff', 'zrange', 'mget', 'zrank', 'get', 'getbit', 'getrange',
                        'zrevrange', 'zrevrangebyscore', 'hexists', 'object', 'sinter', 'zrevrank', 'hget',
                        'zscore', 'hgetall', 'sismember'];

module.exports = redisCommand = {
  readOnly: function(command){
    return _.include(readOnlyCommands, command.split("\r\n")[2]);
  }
};