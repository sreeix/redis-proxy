Configuration
==============

Following options are available


* servers -> An Array of  Server Information. This should form the default "cluster". host defaults to localhost and port to 6379.
* mode -> can be one `readsToSlaves` or `allToMaster` defaults to allToMaster
* listen_port -> The port on which to listen for redis requests defaults to 9999
* bind_address -> The address to bind on the local machine, defaults to 127.0.0.1, set this to "0.0.0.0" for it to be accessible from other servers.
* check_period -> Ping the redis servers every <check_period> milliseconds, defaults to 5000 milliseconds
* pool_size -> Size of the connection pools held to the redis server defaults to 50. Currently connection pool cannot be turned off.
* debug -> Put a lot of debugging information, defaults to false. It does put a lot of debugging information. Always goes to the stdout.
* slave_balance -> how to balance between slaves when using `readsToSlaves` mode. Defaults to round robin and the only one supported.
* loggers -> An array of additional logs that go to the file. An array can be specified, and will support all the options of the [`winston.transports.File`](https://github.com/flatiron/winston/blob/master/docs/transports.md#file-transport) class.

`
  {
  "servers": [{
    "host": "localhost"
    ,"port": 6379
  }
  , {
    "host": "localhost"
    , "port": 6389
  }
  ]
  ,"mode": "readsToSlaves"
  ,"listen_port": 9999
  ,"bind_address": "0.0.0.0"
  ,"check_period": 5000
  ,"pool_size": 50
  , "debug": false
  , "slave_balance": "roundrobin"
  , "loggers":[{ "filename": "redis-proxy.log", "level":"silly" } ]
}
`