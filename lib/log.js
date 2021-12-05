const bunyan = require('bunyan');

module.exports = bunyan.createLogger({
  name: "scriptor",
  level: "info",
  stream: process.stderr
});
