var _ = require('underscore');
var redisCommand = require('./redis_command');
var util = require('util');
var Server = require('./server');
var logger = require('./logging').logger;

// Acts as a proxy for a set of redis servers
// first redis becomes the master and then on failure we move to the next one in the list
// When redis becomes the master it executes a slave of no one, and all other redises will
// automatically become slave of this master.
// this is also true when the redis dies and another redis takes over.
// This should also monitor coming up of redis servers and slave them as appropriate.

var RedisProxy = module.exports = function(o){
  var self = this;
  // redis.debug_mode = o.debug || false;

  this._active = null;
  this._activeSlaves = [];
  this.slaveIndex = 0;

  this.options = _.defaults(o, {listen_port: 6379, softErrorCount: 5, pool_size: 10, mode: "allToMaster"});
  if(o.servers && o.servers.size === 0)
    throw new Error("Expected to have at least one redis to proxy. Can't start");

  this.sendCommand = this[this.options.mode];
  logger.info("Using the "+ this.options.mode +" mode.");
  var onDown = function onDown(){
    if(_.isEqual(self._active.options, this.options)){
      logger.error("Main server down PANIC");
      logger.info("finding next active server.");
      self.nextActive();
    } else {
      self._activeSlaves = _.without(self._activeSlaves, this);
    }
  };
  var onUp =  function onUp() {
    logger.debug("We have a server that went up");
    if(!self.active && this.client.server_info.role === 'master'){
      self._active = this;
      logger.info("setting up the active "+ self._active.options.host + ":" + self._active.options.port);
      self.readyup(this);
    } else {
      // this is slightly tricky. The active has not been selected yet, in such a case we can slave this redis server.
      // But when the master is selected the remaining redises will be slaved correctly. via the `readyup` method
      if(self._active) this.slave(self._active);
      if(! _.include(self._activeSlaves, this)) self._activeSlaves.push(this);
    }
  };

  this.allServers = _.map(o.servers, function(server){
    return new Server(_.defaults(server, {pool_size: self.options.pool_size, softErrorCount: self.options.softErrorCount}))
    .on('up', onUp)
    .on('down', onDown);
  });
};

RedisProxy.prototype.readyup = function(active){
  logger.info("Creating the pool for active server"+ active.options.port);
  var self = this;
  active.setMaster();
  _.each(this.allServers, function(s){
      if(!_.isEqual(s, active) && !_.include(self._activeSlaves, this) && s.isUp()){
        s.slave(active);
        self._activeSlaves.push(s);
      }
  });
};

RedisProxy.prototype.nextActive = function() {
  this._active = _.chain(this.allServers).select(function(server) {
    return server.isUp() && server.client.server_info["slave-priority"] !== "0";
  }).sortBy(function  (server) {
    return server.client.server_info["runid"] ; // no slave priority right now, so just use runid
  }).first().value();

  if(this._active){
    this.readyup(this.active);
    logger.info("Setting up as active "+ this.active.options.host +" : " + this.active.options.port);
  } else {
    logger.error("No redis available");
  }
};

Object.defineProperty(RedisProxy.prototype, 'active', {
  get: function() { return this._active;}
});

// balancing strategies
RedisProxy.prototype.readsToSlaves = function(command, id, callback) {
  var serverToSend = null;
  if(!this.active){
    return callback(new Error("Expected to have atleast one redis to proxy"));
  }
  if(redisCommand.readOnly(command)) {
    logger.info('Read only command');
    serverToSend = (this.nextSlave() || this.active)
  } else {
    logger.info('mutating command');
    serverToSend = this.active;
  }
  logger.info('server:'+ serverToSend.toString());
  return serverToSend.sendCommand(command, id, callback);
};

RedisProxy.prototype.allToMaster = function(command, id, callback) {
  if(this._active){
    this._active.sendCommand(command, id, callback);
  }else{
    return callback(new Error("Expected to have atleast one redis to proxy"));
  }
};

RedisProxy.prototype.nextSlave = function() {
  var slave = this._activeSlaves[this.slaveIndex];
  this.slaveIndex = (this.slaveIndex + 1) % this._activeSlaves.length;
  return slave;
};

RedisProxy.prototype.quit = function(id) {
  if(this.active) this.active.close(id);
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