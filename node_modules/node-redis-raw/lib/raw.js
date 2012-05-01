var redis = require('redis');

redis.RedisClient.prototype.sendRaw = function(command_str, callback){
  var stream = this.stream, buffer_args,  buffered_writes = 0, command_obj;
  if(!this.command_queue.peek){
    this.command_queue.peek = function () {
      if (this.offset === this.head.length) {
        var tmp = this.head;
        tmp.length = 0;
        this.head = this.tail;
        this.tail = tmp;
        this.offset = 0;
        if (this.head.length === 0) {
          return;
        }
      }
      return this.head[this.offset]; // sorry, JSLint
    };
  }
  command_obj = new Command(command_str,[], false, true, callback);
  this.command_queue.push(command_obj);
  this.commands_sent += 1;

  buffered_writes += !stream.write(command_str);
  if (buffered_writes || this.command_queue.getLength() >= this.command_queue_high_water) {
    this.should_buffer = true;
  }
  return !this.should_buffer;
};

var originalOnData = redis.RedisClient.prototype.on_data;

redis.RedisClient.prototype.on_data = function (data) {
  if(this.command_queue.peek && this.command_queue.peek().raw){
    var command_obj = this.command_queue.shift();
    return try_callback(command_obj.callback, data);
  }
  originalOnData.call(this, data);
};

// Cargo culted from node-redis.
function try_callback(callback, reply) {
  try {
    callback(null, reply);
  } catch (err) {
    process.nextTick(function () {
      throw err;
    });
  }
};

function Command(command, args, sub_command, raw, callback) {
  this.command = command;
  this.args = args;
  this.sub_command = sub_command;
  this.raw = raw;
  this.callback = callback;
};
