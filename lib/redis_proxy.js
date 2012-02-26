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
    var s =new Server(server);
    s.on('up', function(){
      console.log("We have a server that went up");
      console.log(this);
    });
    s.on('down', function(){
      console.log("We have a server that went DOWN");
      console.log(this);
    });
  });
};
RedisProxy.prototype.readyup = function(server){
  console.log("Creating the pool for active server"+ server.options.host);
  this.connections = new Pool({create: function(){
    return redis.createClient(server.options.port, server.options.host);
  }});
};
RedisProxy.prototype.active = function(command, callback) {
  return this._active;
}

RedisProxy.prototype.sendCommand = function(command, callback) {
  return this.connections.take().sendRaw(command, callback);
};

RedisProxy.prototype.findByClient = function(client){
  return _.find(this.allServers, function(server){ 
    return (server.client.port == client.port && server.client.host === client.host);
  });
};

RedisProxy.prototype.watch = function(){
  var self = this;
  setInterval(function(){
    _.each(this.allServers, function(server){
      server.ping();
    });
  }, this.options.check_period);
}

