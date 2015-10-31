'use strict';

var amqp = require('amqp');
var util = require('./lib/util');
var Job = require('./lib/job');
var argv = require('minimist')(process.argv.slice(2));
var UglifyJS = require('uglifyjs');
var UglifyCSS = require('uglifycss');
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
          queue.subscribe(
            function(message, headers, deliveryInfo, messageObject) {
              var job = new Job(
                exchange,
                message,
                headers,
                deliveryInfo,
                messageObject
              );

              try {
                var jobObject = JSON.parse(job.getBody());
                if (typeof jobObject.type === 'undefined' ||
                  typeof jobObject.content === 'undefined') {
                  job.sendFail('Job was missing required type or content.');
                } else {
                  if (jobObject.type === 'js') {
                    util.debug('minifying js ...');
                    var result = UglifyJS.minify(
                      jobObject.content,
                      {
                        fromString: true,
                        mangle: true,
                        compress: true
                      }
                    );
                    util.debug('done');
                    job.sendSuccess(result.code);
                  } else if (jobObject.type === 'css') {
                    // Compress CSS.
                    var response = '';
                    job.sendSuccess(response);
                  } else {
                    job.sendFail('Unknown resource type.');
                  }
                }
              } catch (e) {
                job.sendFail('Job was not formatted correctly.');
              }
            }
          );
          util.debug('queue is subscribed');
        }
      );
    }
  );
});
