var redis = require('redis');
var _ = require('underscore');
// redis.debug_mode = true;

// Acts as a proxy for a set of redis servers
// first redis becomes the master and then on failure we move to the next one in the list
// When redis becomes the master it executes a slave of no one, and all other redises will 
// automatically become slave of this master.
// this is also true when the redis dies and another redis takes over.
// This should also monitor coming up of redis servers and slave them as appropriate.

var RedisProxy = module.exports = function(o){
  var self = this;
  this.options = {listen_port: 6379, softErrorCount: 5}
  _.extend(this.options, o);
  if(o.servers && o.servers.size === 0 ) {
    throw new Error("Expected to have atleast one redis to proxy");
  }
  this.allServers = _.map(o.servers, function(server){
    var client = null;
    client =  redis.createClient(server.port, server.host);
    client.on('ready', function(data){
      var server = self.findByClient(client);
      server.up = true;
    });
    
    client.on('error', function(data){
      console.log("error happened tracking error");
      var server = self.findByClient(client);
      server.errorCount+=1;
      if(server.errorCount> self.softErrorCount){
        server.up = false;
      }
      console.log("---------");
      console.log("error");
      console.log(server);
      console.log(data);
      console.log("---------");
    });

    client.on('end', function(data){
      console.log("end happened");
      console.log(data);
    });
    return {options: server, client: client, up: false, errorCount:0};
  });
  
  this._active = _.find(this.allServers, function(server){ return(server.up === true);});
};

RedisProxy.prototype.active = function(command, callback) {
  if(_.isNull(this._active) || _.isUndefined(this._active)){
    this._active = _.find(this.allServers, function(server){ return(server.up === true);});
  }
  return this._active;
}

RedisProxy.prototype.sendCommand = function(command, callback) {
  return this.active().client.sendRaw(command, callback);
};

RedisProxy.prototype.findByClient = function(client){
  return _.find(this.allServers, function(server){ return (server.client.port == client.port && server.client.host === client.host);});
};
RedisProxy.prototype.quit = function(){
  return this.active().client.quit();
}
RedisProxy.prototype.watch = function(){
  var self = this;
  setTimeout(function(){
    console.log('Checking servers');
  }, this.options.check_period);
}

