var _ = require('underscore');
var Pool = require('../../lib/connection_pool');

describe('ConnectionPool', function() {
  it('raises exception when no rediss available', function() {
    (function(){
      new Pool({});
    }).should.throw();
  });
  
  it('should default startsize', function(done) {
    var pool = new Pool({maxSize: 10
      , delayCreation: true
      , create: function(){
        done(false);
      }
    });
    pool.options.startSize.should.equal(3);
    setTimeout(done, 1000);
  });
  it('should not set a 0 startsize', function(done) {
    var pool = new Pool({maxSize: 2
      , delayCreation: true
      , create: function(){
        done(false);
      }
    });
    pool.options.startSize.should.equal(2);
    setTimeout(done, 1000);
  });
  
  it('should default growby', function(done) {
    var pool = new Pool({maxSize: 20
      , delayCreation: true
      , create: function(){
        done(false);
      }
    });
    pool.options.growBy.should.equal(6);
    setTimeout(done, 1000);
  });
  
  it('should default growby to more than 0', function(done) {
    var pool = new Pool({maxSize: 2
      , delayCreation: true
      , create: function(){
        done(false);
      }
    });
    pool.options.growBy.should.equal(2);
    setTimeout(done, 1000);
  });
  
  
  describe("delayCreation", function() {
    it('should not open connections immediately when delayCreation', function(done) {
      new Pool({maxSize: 3
        , delayCreation: true
        , create: function(){
          done(false);
        }
      });
      setTimeout(done, 1000);
    });
    
    it('should create when used on delayCreation', function(done) {
      var pool = new Pool({maxSize: 3
        , delayCreation: true
        , create: function(cb){
          cb(null, 'xx');
        }
      });
      pool.freepool.length.should.equal(0);
      
      pool.take('1', function(err, val){
        val.should.equal('xx');    
        pool.inUsePool['1'].should.equal('xx');
        done();
      });
    });
    
    it('should use same item that was created for the id', function(done) {
      var whatToReturn = ['xx', 'yyy', 'zzzz'];
      var pool = new Pool({maxSize: 10
        , delayCreation: true
        , create: function(cb){
          cb(null, whatToReturn.shift());
        }
      });
      pool.take('1', function(err, conn){
        conn.should.equal('xx');
        pool.take('1', function(err, conn){
          conn.should.equal('xx');
          pool.freepool.length.should.equal(2);
          done();
        });
        
      });
    });
  
    it('should create new connection for another id', function(done) {
      var whatToReturn = ['xx', 'yyy', 'zzzz'];
      var pool = new Pool({maxSize: 3
        , delayCreation: true
        , create: function(cb){
          cb(null, whatToReturn.shift());
        }
      });
      pool.take('1', function(err, conn){
        conn.should.equal('xx');
        pool.take('2', function(err, conn){
          conn.should.equal('yyy');
          pool.freepool.length.should.equal(0);
          done();
        });
      });
    });
  
    it('should release on close', function(done) {
      var whatToReturn = ['xx', 'yyy', 'zzzz'];
      var pool = new Pool({maxSize: 10
        , delayCreation: true
        , create: function(cb){
          cb(null, whatToReturn.shift());
        }
      });
      pool.take('1', function(err, conn){
        conn.should.equal('xx');
        pool.take('2', function(err, conn){
          conn.should.equal('yyy');
          pool.close('2');
          pool.freepool.length.should.equal(2);
          done();
        });
      });
    }); 
    
    it('should assign released for next request', function(done) {
      var whatToReturn = ['xx', 'yyy'];
      var pool = new Pool({maxSize: 2
        , delayCreation: true
        , create: function(cb){
          cb(null, whatToReturn.shift());
        }
      });
      pool.take('1', function(err, conn){
        conn.should.equal('xx');
        pool.take('2', function(err, conn){
          conn.should.equal('yyy');
          pool.close('2');
          pool.freepool.length.should.equal(1);
          pool.take('3', function(err, co){
            co.should.equal('yyy');
            done();
          });
        });
      });
    });
    
    it('should release on close', function(done) {
      var whatToReturn = ['xx', 'yyy', 'zzzz'];
      var pool = new Pool({maxSize: 10
        , delayCreation: true
        , create: function(cb){
          cb(null, whatToReturn.shift());
        }
      });
      pool.take('1', function(err, conn){
        conn.should.equal('xx');
        pool.take('2', function(err, conn){
          conn.should.equal('yyy');
          pool.close('2');
          pool.freepool.length.should.equal(2);
          done();
        });
      });
    });
    
  });
  
  describe('no delaycreation', function(){
    it('should open startSize connection  immediately', function(done) {
      var count = 0;
      var pool = new Pool({maxSize: 3
        , delayCreation: false
        , create: function(cb){
          cb(null, count++);
          if(count == 1){
            done();
          }
        }
      });
    });
    
    it('should open more connections when needed', function(done) {
      var count = 0;
      var pool = new Pool({maxSize: 5
        , startSize: 1
        , delayCreation: false
        , create: function(cb){
          cb(null, count++);
          if(count === 5){
            pool.totalConnections.should.equal(5);
            done();
          }
        }
      });
      _.times(5, function(i){
        pool.take(i, function(err, conn){
          pool.totalConnections.should.equal(i+1);
          pool.freepool.length.should.equal(0);
          _.size(pool.inUsePool).should.equal(i + 1);
        });
      });
    });

    it('should open required connections only', function(done) {
      var count = 0;
      var pool = new Pool({maxSize: 5
        , startSize: 1
        , delayCreation: false
        , create: function(cb){
          return cb(null, count++);
        }
      });
      _.times(5, function(i){
        console.log(i);
        pool.take(i, function(err, conn){
          pool.totalConnections.should.equal(1);
          pool.freepool.length.should.equal(0);
          _.size(pool.inUsePool).should.equal(1);
          pool.close(i);
          pool.freepool.length.should.equal(1);
          _.size(pool.inUsePool).should.equal(0);
          if(i === 4){done();}
        });
      });
    });

    it('should not exeeed maxSize', function(done) {
        var count = 0;
        var pool = new Pool({maxSize: 5
          , startSize: 1
          , delayCreation: false
          , create: function(cb){
            cb(null, count++);
            if(count === 5){
              pool.totalConnections.should.equal(5);
            }
          }
        });
        _.times(6, function(i){
          pool.take(i, function(err, conn){
            if(i === 5){
              err.should.not.equal(null);
              return done();
            }
            pool.totalConnections.should.equal(i+1);
            pool.freepool.length.should.equal(0);
            _.size(pool.inUsePool).should.equal(i + 1);
          });
        });
      });
  });
  
  describe('release', function(){
    it('should close the connection correctly', function(done){
      var whatToReturn = [1,3,6,8];
      var pool = new Pool({maxSize: 3
        , delayCreation: false
        , create: function(cb){
          return cb(null, whatToReturn.shift());
        }
      });
      pool.take('x', function(err, conn){
        pool.totalInUseConnections.should.equal(1);
        pool.release(conn);
        pool.totalInUseConnections.should.equal(0);
        done();
      });
    });
    it('should do nothing if no match', function(done){
      var whatToReturn = [1,3,6,8];
      var pool = new Pool({maxSize: 3
        , delayCreation: false
        , create: function(cb){
          return cb(null, whatToReturn.shift());
        }
      });
      pool.take('x', function(err, conn){
        pool.totalInUseConnections.should.equal(1);
        pool.release('unk');
        pool.totalInUseConnections.should.equal(1);
        done();
      });
    });
  });
});