var net = require('net');
var fs = require('fs');
var RedisProxy = require('./lib/redis_proxy');
var winston = require('winston');

var config = JSON.parse(fs.readFileSync("config/config.json"));
var redis_proxy = new RedisProxy(config);
winston.level = config.debug ? 'debug' : 'info';

var server = net.createServer(function (socket) {
  console.log('client connected');
  socket.on('end', function() {
    console.log('client disconnected');
  });

  socket.on('data', function(data) {
    var command = data.toString('utf8');
    redis_proxy.sendCommand(command, function(err, res) {
      if(err){
        winston.error(err);
      }
      socket.write(res.toString('utf8'));
      if(/quit/i.test(data)){
        socket.end();
        redis_proxy.quit();
      }
    });
  });
});
redis_proxy.watch();

server.listen(config.listen_port, "127.0.0.1");
console.log("server is listening on 127.0.0.1:"+ config.listen_port);