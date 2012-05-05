require('node-redis-raw');
var redis = require('redis');
var _ = require('underscore');
var Pool = require('./connection_pool');
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
          logger.info("Slaving "+ this.client.host+":"+this.client.port + " to " + self._active.options.host+ ":"+ self._active.options.port);
          this.client.slaveof(self._active.options.host, self._active.options.port, redis.print);
        }
      }
    }).on('down', function(){
      console.log(this.options);
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
  this.connections = new Pool({
    create: function(cb){
      try {
        var client = redis.createClient(active.options.port, active.options.host, {max_attempts: 1});
		    client.on('end', function(err, res){
          logger.debug('End on the redis connection received clearning the connection');
          self.connections.release(client);
        });
        return cb(null, client);
      } catch(err) {
        logger.error('Creating onnection to redis server failed with error '+ err);
        return cb(err);
      }
    }
  , maxSize: this.options.pool_size
  , startSize: this.options.pool_size
  , delayCreation: false
  });

  active.slavenone();
  _.each(this.allServers, function (s){
    if(!_.isEqual(s, active)){
      logger.info('Marking '+ s.client.host  + ':' + s.client.port + ' as slave of  '+ active.client.host+':'+active.client.port);
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
    logger.info("Setting up as active "+ this._active.options.host +" : " + this._active.options.port);
  } else {
    throw new Error("Expected to have atleast one redis to proxy");
  }
};

Object.defineProperty(RedisProxy.prototype, 'active', {
  get: function() { return this._active;}
});

RedisProxy.prototype.sendCommand = function(command, id, callback) {
  this.connections.take(id, function(err, conn){
    if(err){
      return callback(err);
    }
    return conn.sendRaw(command, callback);
  });
};

RedisProxy.prototype.quit = function(id) {
  return this.connections.close(id);
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