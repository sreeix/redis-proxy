var _ = require('underscore');

var ConnectionPool = module.exports = function(o){
  var self = this;
  this.options = {size: 20};
  this.count = 0;
  _.extend(this.options, o);
  this.pool = [];
  _.times(this.options.size, function() {
    self.pool.push(o.create());
  });
};

ConnectionPool.prototype.take = function(){
  return this.pool[(this.count++ % this.pool.length)];
}
