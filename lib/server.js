var _ = require('underscore'),
    net = require('net');

var redis = require('redis');

var Pool = require('connection_pool');

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var logger = require('./logging').logger;

var Server = module.exports = function(serverInfo){
  var self = this;
  this.status = 'down';
  this.errorCount = 0;
  this.options = _.defaults(serverInfo, {softErrorCount: 5});
};
// Following events are fired as appropriate
// up: when the server comes up.
// down: when an existing server goes down.
// slave: when the server becomes a slave of another server( Needs to be fleshed)
// master: When a server becomes master.

util.inherits(Server, EventEmitter);

Server.prototype._attachHandlers = function(client){
  var self = this;
  client.on('ready', function(data){
    self.up();
  });
  client.on('error', function(data){
    logger.error("error happened " + data);
    self._incrErrorCount();
  });
  return client;
};

Server.prototype.up = function(){
  if( this.status !== 'up'){
    this.status = 'up';
    this.errorCount = 0;
    if(_.isNull(this.connections) || _.isEmpty(this.connections) ){
      this.connections = this._createConnections();
    }
    this.emit('up');
  }
  return this;
};

Server.prototype.setMaster = function(){
  this._master();
};

Server.prototype.sendCommand = function(command, id, cb){
  var self = this;
  this.connections.take(id, function(err, conn){
    if(err){
      self._incrErrorCount();
      return cb(err);
    }
    logger.debug('sending command to redis '+ command);
    conn.write(command);
    return cb(null, conn);
  });
};

Server.prototype.close = function(id){
  this.connections.close(id);
};

Server.prototype._setupControlClient = function(serverInfo){
  try{
    this.client =  redis.createClient(serverInfo.port, serverInfo.host);
    this._attachHandlers(this.client);
  } catch(err) {
    logger.error(err);
    this.down();
    // Its ok... we will bring this guy up some point in time
  }
};

Server.prototype._createConnections = function(){
  var self = this;
  return new Pool({
    create: function(cb){
      try {
        var client = net.connect({port: self.options.port, host: self.options.host});
        // self._attachHandlers(client);
        return cb(null, client);
      } catch(err) {
        self._incrErrorCount();
        logger.error('Creating Connection to redis server failed with error '+ err);
        return cb(err);
      }
    }
  , maxSize: this.options.pool_size
  , startSize: this.options.pool_size
  , delayCreation: false
  });
};

Server.prototype.slave = function(server){
  var self = this;
  logger.info('Marking '+ this.host  + ':' + this.port + ' as slave of  '+ server.host+': '+ server.port);
  this.client.slaveof(server.client.host, server.client.port, function(err, message){
    if(err){
      return logger.error(err);
    }
    self.emit('slave');
    logger.info(message);
  });
};

Server.prototype._master = function (){
  var self = this;
  logger.info(this.options.host+":"+this.options.port+ " is slave of no one");
  this.client.slaveof('no', 'one', function(err, message){
    if(err){
      return logger.error(err);
    }
    return self.emit('master');
  });
};

Server.prototype._incrErrorCount = function(){
  this.errorCount++;
  if(this.errorCount > this.options.softErrorCount){
    this.down();
  }
};

Server.prototype.ping = function(){
  var self = this;
  if(!this.client){
    this._setupControlClient(this.options);
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
    this._clearConnections();
  }
  return this;
};

Server.prototype._clearConnections = function clearConnections(){
  this.connections.closeAll();
  this.connections = null;
};
Server.prototype.toString = function  () {
  return this.host+":"+ this.port;
}

Object.defineProperty(Server.prototype, 'host', {
  get: function() {return this.options.host;}
});

Object.defineProperty(Server.prototype, 'port', {
  get: function() {return this.options.port;}
});
