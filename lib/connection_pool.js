var _ = require('underscore');
var async = require('async');

// maxSize : Maximum connections on the pool : default 20
// startSize : stars with these many connections: default 1/3 of max connections(6 if not maxSize is not specified)
// Mandatory create function -> takes a function that invokes a callback (err, conn)
// growBy : how to grwo the pool default to 1/3 of max connections
// delayCreation: Creat only on use rather than preemptively. This may mean a slight initial poool creation expense.
//
var ConnectionPool = module.exports = function(o){
  this.options = {maxSize: 20, growBy: 4, close: function(cnnx){}};
  this.count = 0;
  _.extend(this.options, o);
  if(!this.options.startSize){
    this.options.startSize = parseInt(this.options.maxSize /3, 10);
  }
  if(!this.options.growBy){
    this.options.growBy = parseInt(this.options.maxSize /3, 10);
  }
  
  this.freepool = [];
  this.inUsePool = {};
  if(!this.options.delayCreation){
    this.addToFreePool();
  }
};

ConnectionPool.prototype.addToFreePool = function(cb){
  var self = this, remaining, createdConnections = 0;
  var howManyConnections = this.options.growBy;

  if(this.totalConnections === 0){
    howManyConnections = this.options.startSize;
  }
  
  if(!_.isFunction(self.options.create)){
    cb('Need a create method for creating the pool connection');
  }

  remaining = this.options.maxSize - this.totalConnections;
  if( remaining < this.options.growBy){
    howManyConnections = remaining;
  }

  if((this.totalConnections + howManyConnections) > this.maxSize){
    cb('Out of connections');
  }
  
  _.times(howManyConnections, function() {
    self.options.create(function(err, conn){
      createdConnections++;
      if(err) {
        return cb(err);
      }
      console.log('creating connection'+ conn);
      self.freepool.push(conn);
      console.log('free pool size is now '+ self.freepool.length)
      console.log('createdConnections is now '+ createdConnections);
      console.log('howManyConnections is now '+ howManyConnections);
      
      if(createdConnections >= howManyConnections){
        return cb(null, true);
      }
    });
  });
};

ConnectionPool.prototype.take = function take(id, cb){
  var self = this;
  if(this.inUsePool[id]){
    return cb(null, this.inUsePool[id]);
  }
  if(this.freepool.length === 0){
    this.addToFreePool(function(err, res){
      if(err){
        return cb(err);
      }
      console.log('created needed connections. now allocating');
      self.inUsePool[id] = self.freepool.shift();
      console.log(self.inUsePool[id]);
      
      return cb(null, self.inUsePool[id]);
    });
  }
};

ConnectionPool.prototype.close = function close(id){
  if(this.inUsePool[id]){
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

