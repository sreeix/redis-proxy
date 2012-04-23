var _ = require('underscore');
var RedisProxy = require('../../lib/connection_pool');

describe('ConnectionPool', function() {

  it('raises exception when no rediss available', function() {
    (function(){
      new ConnectionPool({});
    }).should.throw();
  });

});
