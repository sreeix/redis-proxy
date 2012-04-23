var _ = require('underscore');

// maxSize : Maximum connections on the pool : default 20
// startSize : stars with these many connections: default 1/3 of max connections(6 if not maxSize is not specified)
// Mandagory open function -> takes a function that invokes a callback (err, conn)
// Optional close function defaults to no op
// growBy : how to grwo the pool default to 4, - 1 for no growth
// delayCreation: Creat only on use rather than preemptively. This may mean a slight initial poool creation expense.
// 
var ConnectionPool = module.exports = function(o){
  this.options = {maxSize: 20, growBy: 4, close: function(cnnx){}};
  this.count = 0;
  _.extend(this.options, o);
  if(!this.options.startSize){
    this.options.startSize = parseInt(this.options.maxSize /3, 10);
  }
  this.pool = [];
  if(!this.options.delayCreation){
    this.createPool();
  }
};

ConnectionPool.prototype.createPool = function(){
  var self = this;
  if(!_.isFunction(self.options.create)){
    throw('Need a create method for creating the pool connection');
  }
  _.times(this.options.size, function() {
    self.options.create(function(err, conn){
      if(err) throw err;
       self.pool.push(conn);
    });
  });
};

ConnectionPool.prototype.take = function take(id){
  
};

ConnectionPool.prototype.random = function(){
  if(this.options.delayCreation && this.pool.length === 0){
    this.createPool();
  }
  return this.pool[(this.count++ % this.pool.length)];
};

ConnectionPool.prototype.closeAll = function(){
  var self = this;
  _.each(this.pool, function(item){
    self.options.close.call(null, item);
  });
  this.pool = [];
};