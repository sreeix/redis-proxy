var redis = require('redis');
var _ = require('underscore');
var Pool = require('./connection_pool');
var Server = require('./server');

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
  
  this.options = {listen_port: 6379, softErrorCount: 5};
  _.extend(this.options, o);
  if(o.servers && o.servers.size === 0 ) {
    throw new Error("Expected to have atleast one redis to proxy");
  }

  this.allServers = _.map(o.servers, function(server){
    return new Server(server).on('up', function() {
      console.log("We have a server that went up");
      if(_.isNull(self._active) || _.isUndefined(self._active)){
        self._active = this;
        console.log("setting up the active "+ self._active.options.port);
        self.readyup(this);
      }
    }).on('down', function(){
      if(_.isEqual(self._active.options, this.options)){
        console.log("Main server down PANIC");
        console.log("finding next active server.");
        self.nextActive();
      }
    });
  });
};

RedisProxy.prototype.readyup = function(server){
  console.log("Creating the pool for active server"+ server.options.port);
  this.connections = new Pool({create: function(){
    try {
       var client = redis.createClient(server.options.port, server.options.host, {max_attempts: 1});
       client.on('error', redis.print);
    } catch(err) {
      console.log(err);
      console.log(">>>>>>>>>>>>>>>");
    }
  }});
};

RedisProxy.prototype.nextActive = function() {
  this._active = _.find(this.allServers, function(server) {
    return server.isUp()
  });
  
  if(this._active){
    this.readyup(this._active);
    console.log("Setting up as active "+ this._active.options.port);
  } else {
    throw new Error("Expected to have atleast one redis to proxy");
  }
}

RedisProxy.prototype.active = function(command, callback) {
  return this._active;
}

RedisProxy.prototype.sendCommand = function(command, callback) {
  return this.connections.take().sendRaw(command, callback);
};

RedisProxy.prototype.watch = function(){
  var self = this;
  setInterval(function(){
    console.log("Timeout.....");
    _.each(self.allServers, function(server){
      console.log("Pinging ");
      console.log(server.options.port);
      server.ping();
    });
  }, this.options.check_period);
}

