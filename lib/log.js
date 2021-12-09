const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: "scriptor",
  level: "info",
  stream: process.stdout
});
module.exports = log;
