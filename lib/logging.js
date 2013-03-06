var winston = require('winston');
var newLogger = function (debug) {
  return new (winston.Logger)({"exitOnError" : false, 
                                   "transports" : [new (winston.transports.Console)({ "colorize" : true, "level" : debug? 'info': "error", "silent" : false, "handleExceptions" : false })]});
}
var logInstance = newLogger(false);

var logging = module.exports = {
  logger : logInstance,
  setLogLevel : function (debug) {
    return logging.logger = newLogger(debug);
  }
}