var _ = require('underscore');
var Pool = require('../../lib/connection_pool');

describe('ConnectionPool', function() {

  it('raises exception when no rediss available', function() {
    (function(){
      new Pool({});
    }).should.throw();
  });

  it('should open connections immediately', function(done) {
    new Pool({maxSize: 3
      , delayCreation: false
      , create: function(){
        done();
      }
    });
  });

  it('should not open connections immediately when delayCreation', function(done) {
    new Pool({maxSize: 3
      , delayCreation: true
      , create: function(){
        done(false);
      }
    });
    setTimeout(done, 1000);
  });
  
  it('should create when used on delayCreation', function() {
    var pool = new Pool({maxSize: 3
      , delayCreation: true
      , create: function(cb){
        cb(null, 'xx');
      }
    });
    pool.freepool.length.should.equal(0);
    pool.take('1').should.equal('xx');
    pool.inUsePool['1'].should.equal('xx');
  });

  it('should use same item that was created for the id', function() {
    var whatToReturn = ['xx', 'yyy'];
    var pool = new Pool({maxSize: 3
      , delayCreation: true
      , create: function(cb){
        cb(null, whatToReturn.shift());
      }
    });
    pool.take('1').should.equal('xx');
    pool.take('1').should.equal('xx');
    pool.freepool.length.should.equal(0);
  });

  it('should create new connection for another id', function(done) {
    var whatToReturn = ['xx', 'yyy'];
    var pool = new Pool({maxSize: 3
      , delayCreation: true
      , create: function(cb){
        cb(null, whatToReturn.shift());
      }
    });
    pool.take('1').should.equal('xx');
    pool.take('2').should.equal('yyy');
    pool.freepool.length.should.equal(0);
    done();
  });

  it('should release on close', function() {
    var whatToReturn = ['xx', 'yyy'];
    var pool = new Pool({maxSize: 3
      , delayCreation: true
      , create: function(cb){
        cb(null, whatToReturn.shift());
      }
    });
    pool.take('1').should.equal('xx');
    pool.take('2').should.equal('yyy');
    pool.close('2');
    
    pool.freepool.length.should.equal(1);
  }); 
  
  it('should release on close', function() {
    var whatToReturn = ['xx', 'yyy'];
    var pool = new Pool({maxSize: 3
      , delayCreation: true
      , create: function(cb){
        cb(null, whatToReturn.shift());
      }
    });
    pool.take('1').should.equal('xx');
    pool.take('2').should.equal('yyy');
    pool.close('2');
    
    pool.freepool.length.should.equal(1);
    pool.take('3').should.equal('yyy');
  });
});
