var _ = require('underscore');
var redis = require('redis');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

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
      self.down();
    });

    this.client.on('end', function(data){
      console.log("end happened");
      self.down();
    });
  } catch(err) {
    console.log(err);
    self.down();
    // Its ok... we will bring this guy up some point in time
  }
  
};

Server.prototype.up = function(){
  this.status = 'up';
  this.errorCount = 0;
  this.emit('up');
  return this;
};
  
Server.prototype.ping = function(){
  var self = this;  
  if(!this.client){
    this.setupClient(this.options);
  } else {
    this.client.ping(function(){
      console.log("xxxxxxxxxx");
      self.up();
    });
  }
};

Server.prototype.down = function(){
  this.status = 'down';
  this.emit('down');
  return this;
};