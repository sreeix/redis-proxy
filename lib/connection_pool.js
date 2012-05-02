var _ = require('underscore');
var async = require('async');
var logger = require('winston');


// maxSize : Maximum connections on the pool : default 20
// startSize : stars with these many connections: default 1/3 of max connections(6 if not maxSize is not specified)
// Mandatory create function -> takes a function that invokes a callback (err, conn)
// growBy : how to grwo the pool default to 1/3 of max connections
// delayCreation: Creat only on use rather than preemptively. This may mean a slight initial poool creation expense.

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
    this.addConnectionsToPool();
  }
};

ConnectionPool.prototype.addToFreePool = function(cb){
  var self = this, remaining;
  var howManyConnections = this.options.growBy;
  howManyConnections = (this.totalConnections === 0) ? this.options.startSize : this.options.growBy ;
  logger.info('Going to Create' + howManyConnections + ' connections current Connections->' + this.totalConnections);

  if(!_.isFunction(self.options.create)){
    cb('Need a create method for creating the pool connection');
  }

  remaining = this.options.maxSize - this.totalConnections;
  console.log('Remaining '+ remaining);
  if( howManyConnections > remaining){
    howManyConnections = remaining;
  }
  logger.info('need ' + howManyConnections + ' connections');

  if(remaining === 0){
    cb('Out of connections');
  }
  
  _.times(howManyConnections, function(i) {
    self.options.create(function(err, conn){
      if(err) {
        return cb(err);
      }
      self.freepool.push(conn);
      console.log('created connections->' + (i+1) + ' , needed Connections ->' + howManyConnections );
      if(i+1 === howManyConnections){
        logger.debug('created ' + (i+1) + ' connections');
        return cb(null, true);
      }
    });
  });
};

ConnectionPool.prototype.addConnectionsToPool = function(cb){
  var self = this;
  if(!cb){ 
    cb = function(err, conn){}
  }
  this.addToFreePool(function(err, res){
    if(err){
      return cb(err);
    }
    logger.info('added stuff to freepool' + self.freepool.length);
    return cb(null, true);
  });
};

ConnectionPool.prototype.take = function take(id, cb){
  var self = this;
  logger.info('taking connection from pool for '+ id);
  if(this.inUsePool[id]){
    logger.info('Found existing connection in use pool...');
    return cb(null, this.inUsePool[id]);
  }
  if(this.freepool.length === 0){
    logger.info('Free pool is empty...');
    this.addConnectionsToPool(function(err, done){
      if(err){
        logger.error(err);
        return cb(err);
      }
      logger.info('Adding more to free pool and allocating.');
      
      self.inUsePool[id] = self.freepool.shift();
      return cb(null, self.inUsePool[id]);
    });
  } else {
    logger.info('Free pool exists... reserving one from there..');
    this.inUsePool[id] = this.freepool.shift();
    return cb(null, this.inUsePool[id]);
  }
};

ConnectionPool.prototype.close = function close(id){
  console.log(this.inUsePool[id]);
  if(this.inUsePool[id] !== undefined){
    this.freepool.push(this.inUsePool[id]);
    delete this.inUsePool[id];
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

