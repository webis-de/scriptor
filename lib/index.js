const fs = require("fs-extra");
const path = require('path');

const packageInfo = fs.readJsonSync(path.join(__dirname, "..", "package.json"));

module.exports = {

  /**
   * Current version of Scriptor
   */
  VERSION: packageInfo.version,

  AbstractScriptorScript: require('./AbstractScriptorScript'),
  // cli: require('./cli'), // development only
  files: require('./files'),
  log: require('./log'),
  pages: require('./pages')
  // pywb: require('./pywb'), // development only
  // scripts: require('./scripts') // development only
};
