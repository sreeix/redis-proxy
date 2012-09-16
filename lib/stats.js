var data = {};
module.exports = Stats = {
  incr: function(item){
    if(!data[item]) data[item] = 0;
    return ++data[item];
  },
  decr: function(item){
    if(!data[item]) data[item] = 0;
    return --data[item];
  },
  value: function(item){
    return data[item] || 0;
  },
  set: function(item, value){
    data[item] = value;
  },
  all: function(){
    return data;
  }
};