const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: "scriptor",
  level: "info",
  stream: process.stderr
});
module.exports = log;
