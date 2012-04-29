var redis = require('redis');
var _ = require('underscore');
var Pool = require('./connection_pool');
var Server = require('./server');
var logger = require('winston');

// redis.debug_mode = true;

// Acts as a proxy for a set of redis servers
// first redis becomes the master and then on failure we move to the next one in the list
// When redis becomes the master it executes a slave of no one, and all other redises will 
// automatically become slave of this master.
// this is also true when the redis dies and another redis takes over.
// This should also monitor coming up of redis servers and slave them as appropriate.

var RedisProxy = module.exports = function(o){
  var self = this;
  this._active = null;
  
  this.options = {listen_port: 6379, softErrorCount: 5, pool_size: 10};
  _.extend(this.options, o);
  if(o.servers && o.servers.size === 0 ) {
    throw new Error("Expected to have atleast one redis to proxy");
  }

  this.allServers = _.map(o.servers, function(server){
    return new Server(server).on('up', function() {
      logger.info("We have a server that went up");
      if(_.isNull(self._active) || _.isUndefined(self._active)){
        self._active = this;
        logger.info("setting up the active "+ self._active.options.host + ":" + self._active.options.port);
        self.readyup(this);
      } else {
        logger.info("Slaving "+ this.options.host+":"+this.options.port + "to" + self._active.options.host+ ""+ self._active.options.port);
        this.client.slaveof(self._active.options.host, self._active.options.port, redis.print);
      }
    }).on('down', function(){
      if(_.isEqual(self._active.options, this.options)){
        logger.error("Main server down PANIC");
        logger.info("finding next active server.");
        self.nextActive();
      }
    });
  });
};

RedisProxy.prototype.readyup = function(active){
  logger.info("Creating the pool for active server"+ active.options.port);
  this.connections = new Pool({
    create: function(cb){
      try {
        var client = redis.createClient(active.options.port, active.options.host, {max_attempts: 1});
        return cb(null, client);
      } catch(err) {
        logger.error('Connection to redis server failed')
        return callback(err);
      }
    }
  , maxSize: this.options.pool_size
  , close: function close(conn){
    conn.quit();
  }});
  active.slavenone();
  _.each(this.allServers, function (s){
    if(!_.isEqual(s, active)){
      s.client.slaveof(active.host, active.port, redis.print);
    }
  });
};

RedisProxy.prototype.nextActive = function() {
  this._active = _.find(this.allServers, function(server) {
    return server.isUp()
  });
  
  if(this._active){
    this.readyup(this._active);
    logger.info("Setting up as active "+ this._active.options.host +" : " + this._active.options.port);
  } else {
    throw new Error("Expected to have atleast one redis to proxy");
  }
};

Object.defineProperty(RedisProxy, 'active', { 
	get: function() {
    return this._active;
	}
});

RedisProxy.prototype.sendCommand = function(command, id, callback) {
  return this.connections.take(id).sendRaw(command, callback);
};

RedisProxy.prototype.quit = function(id) {
  return this.connections.close(id);
};

RedisProxy.prototype.watch = function(){
  var self = this;
  setInterval(function(){
    _.each(self.allServers, function(server){
      logger.info("Pinging "+ server.options.host +":"+ server.options.port);
      server.ping();
    });
  }, this.options.check_period);
};