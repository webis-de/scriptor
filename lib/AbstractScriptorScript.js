const log = require('./log');

module.exports = class {

  /**
   * Creates a new script.
   * @param {string} name - Name of the script
   * @param {string} version - Version of the script (in
   * <a href="https://semver.org/">semantic versioning</a>:
   * "major.minor.patch")
   */
  constructor(name = "UnnamedScript", version = "0.0.0") {
    log.info({ scriptName: name, version: version }, "Script.construct");
  }

  /**
   * Runs this script.
   *
   * See <a href="https://github.com/webis-de/scriptor#developing-own-scripts">Developing Own Scripts</a>
   * in the README.
   * @param {object} browserContexts - An object containing a Playwright
   * BrowserContext for each directory in either the script or input directory's
   * contexts directory, with the respective directory name as key; or a
   * BrowserContext under {@link files.BROWSER_CONTEXT_DEFAULT} if no such
   * directory exists
   * @param {string} scriptDirectory - The directory that contains the Script.js
   * and other run-independent files for the script (read-only)
   * @param {string|null} inputDirectory - The directory that contains the
   * run-dependent files for the script (read-only), or <code>null</code>
   * @param {string} outputDirectory - The directory to which all output of the
   * script run should be written to (read-write)
   * @returns {boolean} - Whether the script could be called again with the
   * output directory as a new input directory
   * @see files.getContextsDirectory
   */
  async run(browserContexts, scriptDirectory, inputDirectory, outputDirectory) {
    throw new Error("Run method not implemented");
  }

};


