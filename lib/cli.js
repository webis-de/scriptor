// Static functions to configure and start a pywb instance.

const commander = require('commander');
const fs = require("fs-extra");
const path = require('path');
const os = require('os');

const files = require('./files');
const log = require('./log');
const scripts = require('./scripts');

const packageInfo = fs.readJsonSync(path.join(__dirname, "..", "package.json"));

/**
 * The Scriptor command line interface.
 */
const program = commander
  .version(packageInfo.version)
  .usage('[options] '
    + '--script-directory <directory> '
    + '--output-directory <directory>')
  .description("Runs a Scriptor web user simulation script.")
  .requiredOption('-s, --script-directory <directory>', 'The directory '
    + 'containing the Script.js and other run-independent files')
  .option('-i, --input-directory <directory>', 'The directory containing files '
    + 'for this specific run; or "-" to use a temporary directory with a '
    + files.SCRIPT_CONFIGURATION_FILE + ' file read from standard input')
  .requiredOption('-o, --output-directory <directory>', 'The directory the run '
    + 'output is written to')
  .option('-r, --replay [mode]', 'Use the WARC web archive of the script or '
    + 'input directory (prefered if exists) to answer the browser requests; '
    + 'Modes: "r" (default if mode is missing) for read-only and "rw" to first '
    + 'copy the web archive to the output directory and then add missing '
    + 'resources to the copy')
  .option('-p, --proxy <address>', 'Use this proxy server for connecting to '
    + 'the Internet (e.g., "http://myproxy.com:3128" or '
    + '"socks5://myproxy.com:3128")')
  .option('-x, --insecure', 'Ignore HTTPS errors (only considered when '
    + '--no-warc is set and --replay is not)')
  .option('-b, --show-browser', 'Show the browser (no headless mode)')
  .option('-u, --unrandomize', 'Specifies how to overwrite Math.random: '
    + '"not" or by a "constant" (default)')
  .option('-v, --video [scale-factor]', 'Store a video recording of the run, '
    + 'and optionally set its scale factor relative to viewport size')
  .option('-a, --no-har', 'Do not store a HAR archive of the run')
  .option('-t, --no-tracing', 'Do not store a playwright trace of the run')
  .option('-w, --no-warc', 'Do not store a WARC web archive of the run');
module.exports.program = program;

/**
 * Gets the run options for {@link scripts.run}.
 * @param {object} options - The parsed options
 * @returns {object} - The options to pass to {@link scripts.run}
 */
const getRunOptions = function(options) {
  const runOptions = {};
  if (options.replay !== undefined) {
    if (options.replay === true || options.replay === "r") {
      scripts.setRunOptionReplayReadOnly(runOptions);
    } else if (options.replay === "rw") {
      scripts.setRunOptionReplayReadWrite(runOptions);
    } else {
      throw new Error("Invalid value for --replay: '" + options.replay + "'");
    }
  } 
  if (options.proxy !== undefined) {
    scripts.setRunOptionProxy(runOptions, options.proxy);
  }
  if (options.insecure !== undefined) {
    scripts.setRunOptionInsecure(runOptions);
  }
  if (options.showBrowser !== undefined) {
    scripts.setRunOptionShowBrowser(runOptions);
  }
  if (options.unrandomize !== undefined) {
    if (options.unrandomize === true || options.unrandomize === "constant") {
      scripts.setRunOptionUnrandomizeByConstant(runOptions);
    } else if (options.unrandomize === "not") {
      scripts.setRunOptionUnrandomizeNot(runOptions);
    } else {
      throw new Error(
        "Invalid value for --unrandomize: '" + options.unrandomize + "'");
    }
  }
  if (options.video !== undefined) {
    if (options.video === true) {
      scripts.setRunOptionVideo(runOptions);
    } else {
      scripts.setRunOptionVideo(runOptions, parseFloat(options.video));
    }
  }
  if (!options.har) {
    scripts.setRunOptionNoHar(runOptions);
  }
  if (!options.tracing) {
    scripts.setRunOptionNoTracing(runOptions);
  }
  if (!options.warc) {
    scripts.setRunOptionNoWarc(runOptions);
  }
  return runOptions;
};
module.exports.getRunOptions = getRunOptions;

/**
 * Gets the script directory from the parsed command line options.
 * @param {object} options - The parsed options
 * @returns {string} - The script directory path
 */
const getScriptDirectory = function(options) {
  const scriptDirectory = options.scriptDirectory;
  if (!fs.existsSync(scriptDirectory)) {
    throw new Error(
      "script directory '" + scriptDirectory + "' does not exist.");
  }
  if (!fs.statSync(scriptDirectory).isDirectory()) {
    throw new Error(
      "script directory '" + scriptDirectory + "' is not a directory.");
  }
  return scriptDirectory;
};
module.exports.getScriptDirectory = getScriptDirectory;

/**
 * Gets the input directory from the parsed command line options.
 * @param {object} options - The parsed options
 * @returns {string} - The input directory path or <code>null</code> if none
 */
const getInputDirectory = function(options) {
  const inputDirectory = options.inputDirectory;

  // no input directory
  if (inputDirectory === undefined) { return null; }

  // temporary input directory
  if (inputDirectory === "-") {
    const tmpInputDirectory =
      fs.mkdtempSync(path.join(os.tmpdir(), "scriptor-input-"));
    const configurationString = fs.readFileSync(0); // read from STDIN
    const configurationFile =
      path.join(tmpInputDirectory, files.SCRIPT_OPTIONS_FILE_NAME);
    log.info({
      file: configurationFile,
      configuration: JSON.parse(configurationString)
    }, "cli.getInputDirectory.fromStdIn");
    fs.writeFileSync(configurationFile, configurationString);
    return tmpInputDirectory;
  }

  // normal case
  if (!fs.existsSync(inputDirectory)) {
    throw new Error(
      "input directory '" + inputDirectory + "' does not exist.");
  }
  if (!fs.statSync(inputDirectory).isDirectory()) {
    throw new Error(
      "input directory '" + inputDirectory + "' is not a directory.");
  }
  return inputDirectory;
};
module.exports.getInputDirectory = getInputDirectory;

/**
 * Gets the output directory from the parsed command line options.
 * @param {object} options - The parsed options
 * @returns {string} - The output directory path
 */
const getOutputDirectory = function(options) {
  const outputDirectory = options.outputDirectory;
  fs.mkdirsSync(outputDirectory);
  if (!fs.statSync(outputDirectory).isDirectory()) {
    throw new Error(
      "output directory '" + outputDirectory + "' is not a directory.");
  }
  return outputDirectory;
};
module.exports.getOutputDirectory = getOutputDirectory;

