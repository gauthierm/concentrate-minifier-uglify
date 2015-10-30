'use strict';

var amqp = require('amqp');
var util = require('./lib/util');
var Job = require('./lib/job');
var argv = require('minimist')(process.argv.slice(2));
var uglifyjs = require('uglifyjs');
var uglifycss = require('uglifycss');
var cliPackage = require('./package');

util.showDebug = argv.d || argv.debug;
var versionFlag = argv.v || argv.version;
var helpFlag = argv.h || argv.help;
var server = argv.s || argv.server || 'localhost';

if (server === true) {
  util.log('Server name is required with -s or --server options.');
  process.exit(1);
}

if (versionFlag) {
  var name = cliPackage.name;
  util.log(
    name.substring(0, 1).toUpperCase() + name.substring(1),
    'CLI version',
    cliPackage.version
  );
  process.exit(0);
}

if (helpFlag) {
  util.log(cliPackage.description);
  util.log();
  util.log('Usage:');
  util.log('  ', cliPackage.name);
  util.log();
  util.log('Options:');
  util.log(
    '  -s, --server name  The host name of the AMQP server to use.',
    'If not specified,'
  );
  util.log('                      localhost is used.');
  util.log('  -d, --debug        Show extra debug output.');
  util.log('  -h, --help         Show this help and exit.');
  util.log('  -v, --version      Show the version and exit.');
  util.log();
  process.exit(0);
}

process.once('SIGINT', function() {
  util.log('Good bye!');
  process.exit(0);
});

var connection = amqp.createConnection({
  host: server,
  connectionTimeout: 5000
});

connection.on('error', function(error) {
  console.error(error);
});

// Wait for connection to become established.
connection.on('ready', function() {
  util.debug('connection is ready');

  connection.exchange(
    undefined,
    { },
    function(exchange) {
      exchange.on('error', function(e) {
        console.log(e);
      });
      util.debug('exchange opened');
      connection.queue(
        'global.concentrate-minifier',
        {
          durable: true,
          autoDelete: false
        },
        function(queue) {
          // Catch all messages
          queue.bind('#');
          util.debug('queue is bound');

          // Receive messages
          queue.subscribe(function(message, headers, deliveryInfo, messageObject) {
            var job = new Job(
              exchange,
              message,
              headers,
              deliveryInfo,
              messageObject
            );
            job.sendSuccess('asdf');
            util.debug('received message', message);
          });
          util.debug('queue is subscribed');
        }
      );
    }
  );
});
