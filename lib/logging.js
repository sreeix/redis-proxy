var winston = require('winston'),
    _ = require('underscore');

var newLogger = function (debug, loggers) {
  var transports = [new (winston.transports.Console)({ "colorize" : true, "level" : debug ? 'info': "error", "silent" : false, "handleExceptions" : false })];
  if (loggers){
    _.each(loggers, function (logger) {
      transports.push(new (winston.transports.File)(logger));
    });
  }
  return new (winston.Logger)({"exitOnError" : false, "transports" : transports});
};
var logInstance = newLogger(false);

var logging = module.exports = {
  logger : logInstance,
  setupLogging : function (debug, loggers) {
    return logging.logger = newLogger(debug, loggers);
  }
};