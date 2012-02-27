var _ = require('underscore');
var redis = require('redis');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var winston = require('winston');


var Server = module.exports = function(serverInfo){
  var self = this;
  this.status = 'down';
  this.errorCount = 0;
  this.options = serverInfo;
  this.client = null;
  this.setupClient(serverInfo);
};

util.inherits(Server, EventEmitter);

Server.prototype.setupClient = function(serverInfo){
  var self = this;
  try{
    this.client =  redis.createClient(serverInfo.port, serverInfo.host);
    this.client.on('ready', function(data){
      self.up();
    });
    this.client.on('error', function(data){
      winston.error(data);
      self.down();
    });

    this.client.on('end', function(data){
      winston.info("end happened");
      self.down();
    });
  } catch(err) {
    winston.error(err);
    self.down();
    // Its ok... we will bring this guy up some point in time
  }
  
};

Server.prototype.up = function(){
  if( this.status !== 'up'){
    this.status = 'up';
    this.errorCount = 0;
    this.emit('up');
  }
  return this;
};

Server.prototype.slavenone = function (){
  winston.info(this.options.host+":"+this.options.port+ " is slave of no one");
  this.client.slaveof('no', 'one');
}  

Server.prototype.ping = function(){
  var self = this;  
  if(!this.client){
    this.setupClient(this.options);
  } else {
    this.client.ping(function(err, data){
      if(err){
        return self.down();
      }
      self.up();
    });
  }
};
Server.prototype.isUp = function(){
  return this.status === 'up';
}
Server.prototype.down = function(){
  if( this.status !== 'down'){
    this.status = 'down';
    this.emit('down');
  }
  return this;
};