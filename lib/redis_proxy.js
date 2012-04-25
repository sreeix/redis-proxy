var redis = require('redis');
var _ = require('underscore');
var Pool = require('./connection_pool');
var Server = require('./server');
var winston = require('winston');

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
      winston.info("We have a server that went up");
      if((_.isNull(self._active) || _.isUndefined(self._active)) && this.client.server_info.role === 'master'){
        self._active = this;
        winston.info("setting up the active "+ self._active.options.host + ":" + self._active.options.port);
        self.readyup(this);
      } else {
        // this is slightly tricky. The active has not been selected yet, in such a case we can slave this redis server.
        // But when the master is selected the remaining redises will be slaved correctly.
        if(self._active){
          winston.info("Slaving "+ this.client.host+":"+this.client.port + " to " + self._active.options.host+ ":"+ self._active.options.port);
          this.client.slaveof(self._active.options.host, self._active.options.port, redis.print);
        }
      }
    }).on('down', function(){
      if(_.isEqual(self._active.options, this.options)){
        winston.error("Main server down PANIC");
        winston.info("finding next active server.");
        self.nextActive();
      }
    });
  });
};

RedisProxy.prototype.readyup = function(active){
  winston.info("Creating the pool for active server"+ active.options.port);
  this.connections = new Pool({create: function(){
    try {
       var client = redis.createClient(active.options.port, active.options.host, {max_attempts: 1});
       client.on('error', function(){});
       return client;
    } catch(err) {
      winston.error(err);
      return null;
    }
  }, size: this.options.pool_size});
  active.slavenone();
  _.each(this.allServers, function (s){
    if(!_.isEqual(s, active)){
  	  winston.info('Marking '+ s.client.host  + ':' + s.client.port + ' as slave of  '+ active.client.host+':'+active.client.port);  
      s.client.slaveof(active.client.host, active.client.port, redis.print);
    }
  });
};

RedisProxy.prototype.nextActive = function() {
  this._active = _.find(this.allServers, function(server) {
    return server.isUp()
  });
  
  if(this._active){
    this.readyup(this._active);
    winston.info("Setting up as active "+ this._active.options.host +" : " + this._active.options.port);
  } else {
    throw new Error("Expected to have atleast one redis to proxy");
  }
};

RedisProxy.prototype.active = function(command, callback) {
  return this._active;
}

RedisProxy.prototype.sendCommand = function(command, callback) {
  return this.connections.take().sendRaw(command, callback);
};

RedisProxy.prototype.watch = function(){
  var self = this;
  setInterval(function(){
    _.each(self.allServers, function(server){
      winston.info("Pinging "+ server.options.host +":"+ server.options.port);
      server.ping();
    });
  }, this.options.check_period);
};