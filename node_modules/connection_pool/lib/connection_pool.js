var _ = require('underscore');
var async = require('async');
var logger = require('winston');
var util = require('util');

// maxSize : Maximum connections on the pool : default 20
// startSize : stars with these many connections: default 1/3 of max connections(6 if not maxSize is not specified)
// Mandatory create function -> takes a function that invokes a callback (err, conn)
// growBy : how to grwo the pool default to 1/3 of max connections
// delayCreation: Create only on use rather than preemptively. This may mean a slight initial poool creation expense.
// close : 

var ConnectionPool = module.exports = function(o){
  var self = this;
  this.options = {maxSize: 20, close: function(cnnx){}};
  this.freepool = [];
  this.inUsePool = {};

  _.extend(this.options, o);
  if(!this.options.startSize){
    this.options.startSize = parseInt(this.options.maxSize/3, 10);
    if(this.options.startSize === 0) {
      this.options.startSize = this.options.maxSize;
    }
  }
  if(!this.options.growBy){
    this.options.growBy = parseInt(this.options.maxSize/3, 10);
    if(this.options.growBy === 0) {
      this.options.growBy = this.options.maxSize;
    }
  }
  if(!this.options.delayCreation){
    this._addConnectionsToPool();
  }
};

ConnectionPool.prototype.take = function take(id, cb){
  var self = this;
  if(this.inUsePool[id]){
    return cb(null, this.inUsePool[id]);
  }
  if(this.freepool.length === 0){
    this._addConnectionsToPool(function(err, done){
      if(err){
        logger.error(err);
        return cb(err);
      }
      logger.debug('Adding more to free pool and allocating.');
      
      self.inUsePool[id] = self.freepool.shift();
      return cb(null, self.inUsePool[id]);
    });
  } else {
    logger.debug('Free pool exists... reserving one from there..');
    this.inUsePool[id] = this.freepool.shift();
    return cb(null, this.inUsePool[id]);
  }
};

ConnectionPool.prototype.release = function release(conn){
  logger.debug('releaseing' + conn);
  var matchingId = null;

  _.each(this.inUsePool, function(x, y){
    if(_.isEqual(x, conn)){
      matchingId = y;
    }
  });

  if(matchingId){
    this.close(matchingId);
  }
};

ConnectionPool.prototype.close = function close(id){
  logger.debug("Releaseing "+ id);
  logger.debug(util.inspect(this.inUsePool));
  if(!_.isNull(this.inUsePool[id])){
    logger.debug('connection for id '+ id +' closed')
    this.freepool.push(this.inUsePool[id]);
    delete this.inUsePool[id];
  } else {
    logger.debug('No connection found in the pool.');
    
  }
};

ConnectionPool.prototype.closeAll = function(){
  var self = this;
  _.each(_.keys(this.inUsePool), function(id){
    self.close(id);
  });
};

Object.defineProperty(ConnectionPool.prototype, 'totalConnections', { 
  get: function() {
    return this.freepool.length + _.size(this.inUsePool);
  }
});

Object.defineProperty(ConnectionPool.prototype, 'totalFreeConnections', { 
  get: function() {
    return this.freepool.length;
  }
});

Object.defineProperty(ConnectionPool.prototype, 'totalInUseConnections', { 
  get: function() {
    return _.size(this.inUsePool);
  }
});


ConnectionPool.prototype._addToFreePool = function(cb){
  var self = this, remaining;
  var howManyConnections = this.options.growBy;
  howManyConnections = (this.totalConnections === 0) ? this.options.startSize : this.options.growBy ;

  if(!_.isFunction(self.options.create)){
    cb('Need a create method for creating the pool connection');
  }

  remaining = this.options.maxSize - this.totalConnections;
  if( howManyConnections > remaining){
    howManyConnections = remaining;
  }

  if(remaining === 0){
    cb('Out of connections');
  }

  _.times(howManyConnections, function(i) {
    self.options.create(function(err, conn){
      if(err) {
        return cb(err);
      }
      self.freepool.push(conn);
      if(i+1 === howManyConnections){
        return cb(null, true);
      }
    });
  });
};

ConnectionPool.prototype._addConnectionsToPool = function(cb){
  var self = this;
  if(!cb){ 
    cb = function(err, conn){}
  }
  this._addToFreePool(function(err, res){
    if(err){
      return cb(err);
    }
    return cb(null, true);
  });
};