module.exports = function(config){
  var express = require('express');
  var stats = require('./stats');
  var app = express();

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);

  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(logErrors);
  app.use(clientErrorHandler);
  app.use(errorHandler);

  function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
  }

  function clientErrorHandler(err, req, res, next) {
    if (req.xhr) {
      res.send(500, { error: 'Something blew up!' });
    } else {
      next(err);
    }
  }

  function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
  }

  app.get('/info', function(req, res){
    res.send({stats: stats.all(), config: config});
  });

  app.listen(3000);
  console.log('Listening on port 3000');  
};
