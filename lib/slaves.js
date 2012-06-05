var _ = require('underscore');

module.exports = function Slaves (){
  this.slaveIndex = 0;
  this._activeSlaves = [];
};

Slaves.prototype.up = function(item){
  if(! _.include(self._activeSlaves, item)) self._activeSlaves.push(item);
};

Slaves.prototype.down = function(item){
  self._activeSlaves = _.without(self._activeSlaves, item);
};

Slaves.prototype.empty = function(){
  return (this._activeSlaves.length === 0);
}
