var _ = require('underscore');

var Server = module.exports = function(o){
  this.status = 'down';
  this.errorCount = 0;
  _.extend(this, o);
};

Server.prototype.up = function(){
  this.status = 'up';
  this.errorCount = 0;
  return this;
};

Server.prototype.down = function(){
  if(this.errorCount > 5){
    this.status = 'down';
  } else {
    this.errorCount++;
    this.status = 'suspect';
  }
  return this;
};
