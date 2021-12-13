// Static command line interface functions

const commander = require('commander');
const fs = require("fs-extra");
const os = require("os");
const path = require('path');
const process = require('process');

const files = require('./files');
const scripts = require('./scripts');
const log = require('./log');

const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json")));
const VERSION = packageInfo.version;

/**
 * Default pattern to use for --chain runs.
 */
const CHAIN_PATTERN_DEFAULT = "run%06d";

/**
 * Parses the options for the Scriptor command line interface.
 * @param {boolean} dockerEntrypoint - Whether the options are parsed for the
 * Docker entrypoint or not
 * @returns {object} - The parsed options
 */
const parse = function(dockerEntrypoint = false) {
  const program = commander.version(VERSION);
  if (dockerEntrypoint) {
    program
      .usage('[options]')
      .description("Runs a Scriptor web user simulation script.")
      .addOption(new commander.Option('-s, --script-directory <directory>')
        .default('/script').hideHelp())
      .addOption(new commander.Option('-o, --output-directory <directory>')
        .default('/output').hideHelp())
      .option('-i, --input <specification>', 'contents of the '
        + 'config.json for this specific run')
  } else {
    program
      .usage('[options] '
        + '--output-directory <directory>')
      .description(
        "Runs a Scriptor web user simulation script in a docker container.")
      .option('-s, --script-directory <directory>', 'the directory '
        + 'containing the Script.js and other run-independent files (default: '
        + 'use the default Snapshot script (requires an input config.json with '
        + '"url" property))')
      .option('-i, --input <specification>', 'one of: (1) the directory '
        + 'containing the files for this specific run (including config.json), '
        + '(2) the contents of the config.json, or (3) "-" read the config.json '
        + 'from standard input')
      .requiredOption('-o, --output-directory <directory>', 'the directory the run '
        + 'output is written to')
      .option('-d, --docker-image-tag <tag>', 'the tag of the docker image to '
        + 'use', VERSION)
      .option('-t, --timeout <milliseconds>', 'abort the script after the '
        + 'specified number of milliseconds (applies to each run of a --chain '
        + 'separately; default: none)')
      .option('-c, --chain [config]', 'run the script several times, using the '
        + 'output directory of a run as the input directory of the next. The '
        + 'config is a JSON object with these properties (all optional):\n'
        + '- pattern: name of the output directoy within --output-directory for '
        + 'each run, with "%0Xd" replaced by the X-digit run number (with leading '
        + 'zeroes; default: "' + CHAIN_PATTERN_DEFAULT + '")\n'
        + '- start: number of the first run (default: 1)\n'
        + '- max: maximum number of runs (default: none)');
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
  log.info({
    options: options,
    runOptions: runOptions
  }, "cli.getRunOptions");
  return runOptions;
};
module.exports.getRunOptions = getRunOptions;

/**
 * Gets the tag of the Docker image to use.
 * @param {object} options - The parsed options
 * @returns {string} - The tag
 */
const getDockerImageTag = function(options) {
  return options.dockerImageTag;
}
module.exports.getDockerImageTag = getDockerImageTag;

/**
 * Gets the specified timeout.
 * @param {object} options - The parsed options
 * @returns {integer|null} - The timeout in milliseconds or <code>null</code> if
 * none
 */
const getTimeout = function(options) {
  // no timeout
  if (options.timeout === undefined) { return null; }
  // milliseconds
  return parseInt(options.timeout);
}
module.exports.getTimeout = getTimeout;

/**
 * Gets the configuration for the Docker run chain.
 * @param {object} options - The parsed options
 * @returns {object|null} - The configuration with properties or
 * <code>null</code> for doing just a single run:
 * <ul>
 * <li>Property <code>pattern</code> (string): name of the output directoy
 * within --output-directory for each run, with "%0Xd" replaced by the X-digit
 * run number (with leading zeroes)</li>'
 * <li>Property <code>start</code> (integer): number of the first run (used in
 * the pattern)</li>'
 * <li>Property <code>max</code> (integer|undefined): maximum number of runs to
 * run</li>
 * </ul>
 */
const getChainConfiguration = function(options) {
  let chain = {};

  // no chain
  if (options.chain === undefined) { return null; }

  // specified
  if (options.chain !== true) {
    chain = JSON.parse(options.chain);
  }

  if (chain.pattern === undefined) {
    chain.pattern = CHAIN_PATTERN_DEFAULT;
  } else if (typeof(chain.pattern) !== "string") {
    throw new Error(
      "chain.pattern is not a string but a " + typeof(chain.pattern));
  } else if (chain.pattern.match("%0[0-9]+d") === null) {
    throw new Error(
      "chain.pattern is missing run format '%0[0-9]+d': '" + chain.pattern + "'");
  }

  if (chain.start === undefined) {
    chain.start = 1;
  } else if (typeof(chain.start) !== "number") {
    throw new Error(
      "chain.start is not a positive integer but a " + typeof(chain.start));
  } else if (!Number.isInteger(chain.start) || chain.start < 1) {
    throw new Error(
      "chain.start is not a positive integer but " + chain.start);
  }

  if (chain.max === undefined) {
  } else if (typeof(chain.max) !== "number") {
    throw new Error(
      "chain.max is not a positive integer but a " + typeof(chain.max));
  } else if (!Number.isInteger(chain.max) || chain.start < 1) {
    throw new Error(
      "chain.max is not a positive integer but " + chain.max);
  }
  
  return chain;
}
module.exports.getChainConfiguration = getChainConfiguration;

/**
 * Gets the script directory from the parsed command line options.
 * @param {object} options - The parsed options
 * @returns {string|null} - The script directory path or <code>null</code> if
 * none
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
 * @param {boolean} dockerEntrypoint - Whether the options are parsed for the
 * Docker entrypoint or not
 * @returns {string|null} - The input directory path or <code>null</code> if none
 */
const getInputDirectory = function(options, dockerEntrypoint = false) {
  const input = options.input;

  // no input directory
  if (input === undefined) {
    if (dockerEntrypoint && fs.existsSync("/input")) {
      return "/input";
    } else {
      return null;
    }
  }

  const makeTemporaryInputDirectory = (config) => {
    const tmpInputDirectory =
      fs.mkdtempSync(path.join(os.tmpdir(), "scriptor-input-"));
    log.info({
      directory: tmpInputDirectory,
      config: JSON.parse(config)
    }, "cli.getInputDirectory.makeTemporaryInputDirectory");
    const configurationFile =
      path.join(tmpInputDirectory, files.SCRIPT_OPTIONS_FILE_NAME);
    fs.writeFileSync(configurationFile, config);
    return tmpInputDirectory;
  };

  if (input === "-") {
    // stdin
    const config = fs.readFileSync(0);
    return makeTemporaryInputDirectory(config);
  }

  if (input.startsWith("{")) {
    // direct specification
    return makeTemporaryInputDirectory(input);
  }

  // directory case
  if (!fs.existsSync(input)) {
    throw new Error("input directory '" + input + "' does not exist.");
  }
  if (!fs.statSync(input).isDirectory()) {
    throw new Error("input directory '" + input + "' is not a directory.");
  }
  return input;
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
  if (options.chain === undefined
      && fs.readdirSync(outputDirectory).length !== 0) {
    throw new Error(
      "output directory '" + outputDirectory + "' is not empty.");
  }
  return outputDirectory;
};
module.exports.getOutputDirectory = getOutputDirectory;

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

