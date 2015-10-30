'use strict';

var chalk = require('chalk');

module.exports = {
  showDebug: false,
  log: function() {
    console.log.apply(null, arguments);
  },
  error: function() {
    console.log(chalk.red.apply(null, arguments));
  },
  warn: function() {
    console.log(chalk.yellow.apply(null, arguments));
  },
  debug: function() {
    if (this.showDebug) {
      console.log.apply(null, arguments);
    }
  },
};
