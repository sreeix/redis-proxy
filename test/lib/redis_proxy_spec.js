var testy = require('../testy');
var _ = require('underscore');
var RedisProxy = require('../../lib/redis_proxy');

describe('RedisProxy', function() {

  it('raises exception when no rediss available', function() {
      new RedisProxy({}).should.throw();
  });

  it('should proxy existing redis', function() {
    var fake = testy.createRedis(6389);
    new RedisProxy({"servers": [{"host": "localhost","port": 6389}]}).should.not.throw();
    fake.close();
  });

  it('should not fail if both redis is down', function() {
    new RedisProxy({"servers": [{"host": "localhost","port": 6389}]}).should.not.throw();
  });

  it('should use first working redis', function() {
    var fake = testy.createRedis(6389);
    var proxy = new RedisProxy({"servers": [{"host": "localhost","port": 6389}, {"host": "localhost","port": 6399}]});
    proxy.active.client.port.should.equal(6389);
    fake.close();
  });

  it('should switch to backup if first fails', function() {
    var fake = testy.createRedis(6399);
    var proxy = new RedisProxy({"servers": [{"host": "localhost","port": 6389}, {"host": "localhost","port": 6399}]});
    proxy.active.client.port.should.equal(6399);
    fake.close();
  });
});