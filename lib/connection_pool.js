var _ = require('underscore');

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

ConnectionPool.prototype.addToFreePool = function(){
  var self = this, remaining;
  var howManyConnections = this.options.growBy;
  if(this.totalConnections === 0){
    howManyConnections = this.options.startSize;
  }
  
  if(!_.isFunction(self.options.create)){
    throw('Need a create method for creating the pool connection');
  }
  remaining = this.options.maxSize - this.totalConnections;
  if( remaining < this.options.growBy){
    howManyConnections = remaining;
  }
  if((this.totalConnections + howManyConnections) > this.maxSize){
    throw('Out of connections');
  }
  _.times(howManyConnections, function() {
    self.options.create(function(err, conn){
      if(err) throw err;
       self.freepool.push(conn);
    });
  });
};

ConnectionPool.prototype.take = function take(id){
  if(this.inUsePool[id]){
    return this.inUsePool[id];
  }
  if(this.freepool.length === 0){
    this.addToFreePool();
  }
  this.inUsePool[id] = this.freepool.shift();
  return this.inUsePool[id];
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

