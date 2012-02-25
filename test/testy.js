var net = require('net');

exports.createRedis = function(port){
  var server = net.createServer(function (socket) {
    socket.on('end', function() {
      console.log('disconnect');
    });
    socket.on('data', function(data) {
      console.log("DATA: "+data);
    });
  });
  server.listen(port);
  return server;
}
