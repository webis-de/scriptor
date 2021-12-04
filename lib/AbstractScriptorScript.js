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
    log.info({ name: name, version: version }, "Script.construct");
  }

  /**
   * Runs this script.
   *
   * <h2>Implementation note 1: browser contexts</h2>
   * If this script uses a single browser (the usual case) this method's
   * implementation should start with:
   * ```
   * const browserContext = browserContexts[files.BROWSER_CONTEXT_DEFAULT];
   * ```
   * Note that this still allows to configure the single browser context by
   * placing a {@link files.BROWSER_CONTEXT_OPTIONS_FILE} in the respective
   * context directory (i.e.,
   * <code><i>[scriptDirectory]</i>/browserContexts/default/browser.json</code>
   * and/or
   * <code><i>[inputDirectory]</i>/browserContexts/default/browser.json</code>,
   * if exists, with options in the latter overwriting those in the former).
   *
   * <h2>Implementation note 2: reading script configuration</h2>
   * The suggested way to read the script's configuration is
   * ```
   * const defaultScriptOptions = { ... };
   * const requiredScriptOptions = [ ... ];
   * const scriptOptions = files.readOptions(files.getExisting(
   *     files.SCRIPT_OPTIONS_FILE_NAME, [ scriptDirectory, inputDirectory ]),
   *   defaultScriptOptions, requiredScriptOptions);
   * ```
   * which parses the  <code><i>[scriptDirectory]</i>/config.json</code> and
   * <code><i>[inputDirectory]</i>/config.json</code> (if exists, with options
   * in the latter overwriting those in the former, and a possibility to create
   * the latter from standard input through the <code>--input-directory -</code>
   * command line option).
   *
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


