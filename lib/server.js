var _ = require('underscore');
require('node-redis-raw');

var redis = require('redis');
var Pool = require('connection_pool');

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var logger = require('winston');


var Server = module.exports = function(serverInfo){
  var self = this;
  this.status = 'down';
  this.errorCount = 0;
  this.options = _.defaults(serverInfo, {softErrorCount: 5});
  this.client = null;
  this.setupControlClient(serverInfo);
};

util.inherits(Server, EventEmitter);

Server.prototype.setupControlClient = function(serverInfo){
  try{
    this.client =  redis.createClient(serverInfo.port, serverInfo.host);
    this._attachHandlers(this.client);
  } catch(err) {
    logger.error(err);
    this.down();
    // Its ok... we will bring this guy up some point in time
  }
};

Server.prototype._attachHandlers = function(client){
  var self = this;
  client.on('ready', function(data){
    self.up();
  });
  client.on('error', function(data){
    logger.error("error happened " + data);
    self.incrErrorCount();
  });
  return client;
};

Server.prototype.up = function(){
  if( this.status !== 'up'){
    this.status = 'up';
    this.errorCount = 0;
    this.emit('up');
  }
  return this;
};

Server.prototype.setMaster = function(options){
  var self = this;
  this.connections = new Pool({
    create: function(cb){
      try {
        var client = redis.createClient(self.options.port, self.options.host);
        self._attachHandlers(client);
        return cb(null, client);
      } catch(err) {
        self.incrErrorCount();
        logger.error('Creating Connection to redis server failed with error '+ err);
        return cb(err);
      }
    }
  , maxSize: options.pool_size
  , startSize: options.pool_size
  , delayCreation: false
  });
  this.slavenone();
};

Server.prototype.sendCommand = function(command, id, cb){
  var self = this;
  this.connections.take(id, function(err, conn){
    if(err){
      self.incrErrorCount();
      return cb(err);
    }
    return conn.sendRaw(command, cb);
  });
};

Server.prototype.close = function(id){
  this.connections.close(id);
};

Server.prototype.slave = function(server){
  logger.info('Marking '+ this.client.host  + ':' + this.client.port + ' as slave of  '+ server.client.host+': '+ server.client.port);
  this.client.slaveof(server.client.host, server.client.port, function(err, message){
    if(err){
      return logger.error(err);
    }
    logger.debug(message);
  });
};

Server.prototype.slavenone = function (){
  logger.info(this.options.host+":"+this.options.port+ " is slave of no one");
  this.client.slaveof('no', 'one');
}  

Server.prototype.incrErrorCount = function(){
  this.errorCount++;
  if(this.errorCount > this.options.softErrorCount){
    return this.down();
  }
};

Server.prototype.ping = function(){
  var self = this;  
  if(!this.client){
    this.setupControlClient(this.options);
  } else {
    this.client.ping(function(err, data){
      if(err){
        logger.error(err);
        return self.down();
      }
      self.up();
    });
  }
};

Server.prototype.isUp = function(){
  return this.status === 'up';
};

Server.prototype.down = function(){
  if( this.status !== 'down'){
    this.status = 'down';
    this.emit('down');
  }
  return this;
};