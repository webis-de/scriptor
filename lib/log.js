const bunyan = require('bunyan');

module.exports = bunyan.createLogger({
  name: "skriptor",
  level: "info",
  stream: process.stderr
});
