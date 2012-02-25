var net = require('net');
var fs = require('fs');
var RedisProxy = require('./lib/redis_proxy');

var config = JSON.parse(fs.readFileSync("config/config.json"));
console.log(config);
var redis_proxy = new RedisProxy(config);

var server = net.createServer(function (socket) {
  console.log('server connected');
  socket.on('end', function() {
    console.log('client disconnected');
  });

  socket.on('data', function(data) {
    var command = data.toString('utf8');
    console.log(command);
    
    redis_proxy.sendCommand(command, function(err, res) {
      if(err){
        console.log("err:"+err);
      }
      console.log(res.toString('utf8'));
      socket.write(res.toString('utf8'));
    });
  });
});

server.listen(config.listen_port, "127.0.0.1");
console.log("server is listening on 127.0.0.1:"+ config.listen_port);