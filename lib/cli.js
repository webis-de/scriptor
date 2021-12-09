// Static functions to configure and start a pywb instance.

const commander = require('commander');
const fs = require("fs-extra");
const os = require("os");
const path = require('path');
const process = require('process');

const files = require('./files');

const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json")));

/**
 * Docker image of Scriptor.
 */
const IMAGE = "scriptor";
module.exports.IMAGE = IMAGE;

/**
 * Default pattern to use for --chain runs.
 */
const CHAIN_PATTERN_DEFAULT = "run%06d";

/**
 * Parses the options for the Scriptor command line interface.
 * @param {boolean} docker - Whether the command line is used to run the docker
 * image or not
 * @returns {object} - The parsed options
 */
const parse = function(docker = false) {
  const program = commander
    .version(packageInfo.version);
  if (docker) {
    program
      .usage('[options] '
        + '--output-directory <directory>')
      .description(
        "Runs a Scriptor web user simulation script in a docker container.")
      .option('-s, --script-directory <directory>', 'the directory '
        + 'containing the Script.js and other run-independent files (default: '
        + 'use the default Snapshot script (requires an input config.json with '
        + '"url" property))');
  } else {
    program
      .usage('[options] '
        + '--script-directory <directory> '
        + '--output-directory <directory>')
      .description("Runs a Scriptor web user simulation script.")
      .requiredOption('-s, --script-directory <directory>', 'the directory '
        + 'containing the Script.js and other run-independent files');
  }
  program
    .option('-i, --input-directory <directory>', 'the directory containing files '
      + 'for this specific run; or "-" to use a temporary directory with a '
      + 'config.json file read from standard input')
    .requiredOption('-o, --output-directory <directory>', 'the directory the run '
      + 'output is written to');
  if (docker) {
    program
      .option('-t, --timeout <milliseconds>', 'abort the script after the '
        + 'specified number of milliseconds (default: none)')
      .option('-c, --chain [config]', 'run the script several times, using the '
        + 'output directory of a run as the input directory of the next. The '
        + 'config is a JSON object with these properties (all optional):\n'
        + '- pattern: name of the output directoy within --output-directory for '
        + 'each run, with "%0Xd" replaced by the X-digit run number (with leading '
        + 'zeroes; default: "' + CHAIN_PATTERN_DEFAULT + '")\n'
        + '- start: number of the first run (default: 1)\n'
        + '- max: maximum number of runs (default: none)\n'
        + '- timeout: number of milliseconds before failing a run (and thus the '
        + 'entire chain; default: none)');
  }
  program
    .option('-r, --replay [mode]', 'use the WARC web archive of the script or '
      + 'input directory (prefered if exists) to answer the browser requests; '
      + 'Modes: "r" (default if mode is missing) for read-only and "rw" to first '
      + 'copy the web archive to the output directory and then add missing '
      + 'resources to the copy')
    .option('-p, --proxy <address>', 'use this proxy server for connecting to '
      + 'the Internet (e.g., "http://myproxy.com:3128" or '
      + '"socks5://myproxy.com:3128")')
    .option('-x, --insecure', 'ignore HTTPS errors (only considered when '
      + '--no-warc is set and --replay is not)')
    .option('-b, --show-browser', 'show the browser (no headless mode)')
    .option('-u, --unrandomize', 'specifies how to overwrite Math.random: '
      + '"not" or by a "constant" (default)')
    .option('-v, --video [scale-factor]', 'store a video recording of the run, '
      + 'and optionally set its scale factor relative to viewport size')
    .option('-H, --no-har', 'do not store a HAR archive of the run')
    .option('-T, --no-tracing', 'do not store a playwright trace of the run')
    .option('-W, --no-warc', 'do not store a WARC web archive of the run');
  return program.parse(process.argv).opts();
}
module.exports.parse = parse;

////////////////////////////////////////////////////////////////////////////////
// FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

/**
 * Gets the command arguments to pass to the Docker entrypoint.
 * @param {object} options - The parsed options
 * @returns {array} - The arguments to pass on
 */
const getEntrypointArgs = function(options) {
  const args = [];
  if (options.replay !== undefined) {
    args.push("--replay");
    if (options.replay !== true) { args.push("'" + options.replay + "'"); }
  }
  if (options.proxy !== undefined) {
    args.push("--proxy");
    args.push("'" + options.proxy + "'");
  }
  if (options.insecure !== undefined) { args.push("--insecure"); }
  if (options.showBrowser !== undefined) { args.push("--show-browser"); }
  if (options.unrandomize !== undefined) {
    args.push("--unrandomize");
    if (options.unrandomize !== true) { args.push("'" + options.unrandomize + "'"); }
  }
  if (options.video !== undefined) {
    args.push("--video");
    if (options.video !== true) { args.push("'" + options.video + "'"); }
  }
  if (!options.har) { args.push("--no-har"); }
  if (!options.tracing) { args.push("--no-tracing"); }
  if (!options.warc) { args.push("--no-warc"); }
  return args;
}
module.exports.getEntrypointArgs = getEntrypointArgs;

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

  // no script directory
  if (scriptDirectory === undefined) { return null; }

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
  fs.mkdirSync(outputDirectory, { recursive: true });
  if (!fs.statSync(outputDirectory).isDirectory()) {
    throw new Error(
      "output directory '" + outputDirectory + "' is not a directory.");
  }
  if (fs.readdirSync(outputDirectory).length !== 0) {
    throw new Error(
      "output directory '" + outputDirectory + "' is not empty.");
  }
  return outputDirectory;
};
module.exports.getOutputDirectory = getOutputDirectory;

