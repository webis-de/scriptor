const fs = require("fs-extra");
const path = require('path');

const packageInfo = fs.readJsonSync(path.join(__dirname, "..", "package.json"));

module.exports = {

  /**
   * Current version of Scriptor
   * @memberof scriptor
   */
  VERSION: packageInfo.version,

  AbstractScriptorScript: require('./AbstractScriptorScript'),

  /**
   * Static functions to work with the Scriptor directory structure.
   * @namespace files
   */
  files: require('./files'),

  /**
   * The {@link https://github.com/trentm/node-bunyan#readme|Bunyan} log object
   * that Scriptor uses.
   * @namespace log
   * @example
   * const { log } = require("@webis-de/scriptor");
   * log.info({foo: "bar", answer: 42}, "example.logging");
   */
  log: require('./log'),

  /**
   * Static functions to modify a Playwright page object or get its status.
   * @namespace pages 
   */
  pages: require('./pages')

};

