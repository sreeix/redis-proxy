var _ = require('underscore');

var ConnectionPool = module.exports = function(o){
  this.options = {size: 20, close: function(){}};
  this.count = 0;
  _.extend(this.options, o);
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
      if(conn){
        self.pool.push(conn);
      }
    });
  });
};

ConnectionPool.prototype.random = function(){
	if(this.options.delayCreation && this.pool.length === 0){
    this.createPool();
	}
  return this.pool[(this.count++ % this.pool.length)];
};

ConnectionPool.prototype.closeAll = function(){
	var self = this;
	_each(this.pool, function(item){
		self.options.close.call(null, item);
	});
	this.pool = [];
};
