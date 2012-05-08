require('node-redis-raw');
var redis = require('redis');
var _ = require('underscore');
var Server = require('./server');
var logger = require('winston');


// Acts as a proxy for a set of redis servers
// first redis becomes the master and then on failure we move to the next one in the list
// When redis becomes the master it executes a slave of no one, and all other redises will 
// automatically become slave of this master.
// this is also true when the redis dies and another redis takes over.
// This should also monitor coming up of redis servers and slave them as appropriate.

var RedisProxy = module.exports = function(o){
  var self = this;
  redis.debug_mode = o.debug || false;
  
  this._active = null;

  this.options = {listen_port: 6379, softErrorCount: 5, pool_size: 10};
  _.extend(this.options, o);
  if(o.servers && o.servers.size === 0 ) {
    throw new Error("Expected to have atleast one redis to proxy");
  }

  this.allServers = _.map(o.servers, function(server){
    return new Server(server).on('up', function() {
      logger.debug("We have a server that went up");
      if((_.isNull(self._active) || _.isUndefined(self._active)) && this.client.server_info.role === 'master'){
        self._active = this;
        logger.info("setting up the active "+ self._active.options.host + ":" + self._active.options.port);
        self.readyup(this);
      } else {
        // this is slightly tricky. The active has not been selected yet, in such a case we can slave this redis server.
        // But when the master is selected the remaining redises will be slaved correctly. via the `readyup` method
        if(self._active){
          this.slave(self._active);
        }
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
  logger.debug("Creating the pool for active server"+ active.options.port);
  var self = this;
  active.setMaster(this.options);
  _.each(this.allServers, function (s){
    if(!_.isEqual(s, active)){
      s.slave(active);
    }
  });
};

RedisProxy.prototype.nextActive = function() {
  this._active = _.find(this.allServers, function(server) {
    return server.isUp()
  });

  if(this.active){
    this.readyup(this.active);
    logger.info("Setting up as active "+ this.active.options.host +" : " + this.active.options.port);
  } else {
    throw new Error("Expected to have atleast one redis to proxy");
  }
};

Object.defineProperty(RedisProxy.prototype, 'active', {
  get: function() { return this._active;}
});

RedisProxy.prototype.sendCommand = function(command, id, callback) {
  this.active.sendCommand(command, id, callback);
};

RedisProxy.prototype.quit = function(id) {
  return this.active.close(id);
};

RedisProxy.prototype.watch = function(){
  var self = this;
  setInterval(function(){
    _.each(self.allServers, function(server){
      logger.debug("Pinging "+ server.options.host +":"+ server.options.port);
      server.ping();
    });
  }, this.options.check_period);
};