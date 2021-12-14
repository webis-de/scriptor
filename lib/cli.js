// Static command line interface functions

const commander = require('commander');
const fs = require("fs-extra");
const os = require("os");
const path = require('path');
const process = require('process');

const files = require('./files');
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
      setRunOptionReplayReadOnly(runOptions);
    } else if (options.replay === "rw") {
      setRunOptionReplayReadWrite(runOptions);
    } else {
      throw new Error("Invalid value for --replay: '" + options.replay + "'");
    }
  } 
  if (options.proxy !== undefined) {
    setRunOptionProxy(runOptions, options.proxy);
  }
  if (options.insecure !== undefined) {
    setRunOptionInsecure(runOptions);
  }
  if (options.showBrowser !== undefined) {
    setRunOptionShowBrowser(runOptions);
  }
  if (options.unrandomize !== undefined) {
    if (options.unrandomize === true || options.unrandomize === "constant") {
      setRunOptionUnrandomizeByConstant(runOptions);
    } else if (options.unrandomize === "not") {
      setRunOptionUnrandomizeNot(runOptions);
    } else {
      throw new Error(
        "Invalid value for --unrandomize: '" + options.unrandomize + "'");
    }
  }
  if (options.video !== undefined) {
    if (options.video === true) {
      setRunOptionVideo(runOptions);
    } else {
      setRunOptionVideo(runOptions, parseFloat(options.video));
    }
  }
  if (!options.har) {
    setRunOptionNoHar(runOptions);
  }
  if (!options.tracing) {
    setRunOptionNoTracing(runOptions);
  }
  if (!options.warc) {
    setRunOptionNoWarc(runOptions);
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
      && fs.readdirSync(outputDirectory).length > 1) { // may contain log file
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


////////////////////////////////////////////////////////////////////////////////
// RUN OPTIONS
////////////////////////////////////////////////////////////////////////////////

/**
 * Boolean option whether to store a HAR archive of the run.
 */
const RUN_OPTION_HAR = "har";
module.exports.RUN_OPTION_HAR = RUN_OPTION_HAR;

/**
 * Boolean option whether to ignore HTTPS errors even when not necessary due to
 * other options.
 */
const RUN_OPTION_INSECURE = "insecure";
module.exports.RUN_OPTION_INSECURE = RUN_OPTION_INSECURE;

/**
 * Object option to specify the upstream proxy to use (absent for none).
 */
const RUN_OPTION_PROXY = "proxy";
module.exports.RUN_OPTION_PROXY = RUN_OPTION_PROXY;

/**
 * String option whether to use the WARC of the script or input directory to
 * serve requests.
 * @see RUN_OPTION_REPLAY_NOT
 * @see RUN_OPTION_REPLAY_READ_ONLY
 * @see RUN_OPTION_REPLAY_READ_WRITE
 */
const RUN_OPTION_REPLAY = "replay";
module.exports.RUN_OPTION_REPLAY = RUN_OPTION_REPLAY;

/**
 * Value for {@link RUN_OPTION_REPLAY} to not use the WARCs but the live
 * Internet (the default).
 */
const RUN_OPTION_REPLAY_NOT = "not";
module.exports.RUN_OPTION_REPLAY_NOT = RUN_OPTION_REPLAY_NOT;

/**
 * Value for {@link RUN_OPTION_REPLAY} to use the WARCs and not record new
 * resources.
 */
const RUN_OPTION_REPLAY_READ_ONLY = "r";
module.exports.RUN_OPTION_REPLAY_READ_ONLY = RUN_OPTION_REPLAY_READ_ONLY;

/**
 * Value for {@link RUN_OPTION_REPLAY} to use (a copy of the) WARCs and also
 * record new resources.
 */
const RUN_OPTION_REPLAY_READ_WRITE = "rw";
module.exports.RUN_OPTION_REPLAY_READ_WRITE = RUN_OPTION_REPLAY_READ_WRITE;

/**
 * Default value for {@link RUN_OPTION_REPLAY} if the option is set.
 */
const RUN_OPTION_REPLAY_DEFAULT_IF_SET = RUN_OPTION_REPLAY_READ_ONLY;
module.exports.RUN_OPTION_REPLAY_DEFAULT_IF_SET = RUN_OPTION_REPLAY_DEFAULT_IF_SET;

/**
 * Boolean option whether to show the browser (i.e., not headless).
 */
const RUN_OPTION_SHOW_BROWSER = "showBrowser";
module.exports.RUN_OPTION_SHOW_BROWSER = RUN_OPTION_SHOW_BROWSER;

/**
 * Boolean option whether to store a Playwright trace of the run.
 */
const RUN_OPTION_TRACING = "tracing";
module.exports.RUN_OPTION_TRACING = RUN_OPTION_TRACING;

/**
 * String option how (and if) to change <code>Math.random</code>.
 * @see RUN_OPTION_UNRANDOMIZE_CONSTANT
 * @see RUN_OPTION_UNRANDOMIZE_NOT
 */
const RUN_OPTION_UNRANDOMIZE = "unrandomize";
module.exports.RUN_OPTION_UNRANDOMIZE = RUN_OPTION_UNRANDOMIZE;

/**
 * Value for {@link RUN_OPTION_UNRANDOMIZE} to not change
 * <code>Math.random</code>.
 */
const RUN_OPTION_UNRANDOMIZE_NOT = "not";
module.exports.RUN_OPTION_UNRANDOMIZE_NOT = RUN_OPTION_UNRANDOMIZE_NOT;

/**
 * Value for {@link RUN_OPTION_UNRANDOMIZE} to overwrite <code>Math.random</code>
 * to always return the same number.
 */
const RUN_OPTION_UNRANDOMIZE_CONSTANT = "constant";
module.exports.RUN_OPTION_UNRANDOMIZE_CONSTANT = RUN_OPTION_UNRANDOMIZE_CONSTANT;

/**
 * Boolean | number option whether to store a video recording of the run and at
 * which scale factor.
 */
const RUN_OPTION_VIDEO_SCALE_FACTOR = "video";
module.exports.RUN_OPTION_VIDEO_SCALE_FACTOR = RUN_OPTION_VIDEO_SCALE_FACTOR;

/**
 * Default value for {@link RUN_OPTION_VIDEO_SCALE_FACTOR} if the option is set.
 */
const RUN_OPTION_VIDEO_SCALE_FACTOR_DEFAULT_IF_SET = 1.0;
module.exports.RUN_OPTION_VIDEO_SCALE_FACTOR_DEFAULT_IF_SET = RUN_OPTION_VIDEO_SCALE_FACTOR_DEFAULT_IF_SET;

/**
 * Boolean option whether to store a WARC archive of the run.
 */
const RUN_OPTION_WARC = "warc";
module.exports.RUN_OPTION_WARC = RUN_OPTION_WARC;

/**
 * Default run options.
 */
const RUN_OPTIONS_DEFAULT = {};
RUN_OPTIONS_DEFAULT[RUN_OPTION_HAR] = true;
RUN_OPTIONS_DEFAULT[RUN_OPTION_INSECURE] = false;
RUN_OPTIONS_DEFAULT[RUN_OPTION_PROXY] = false;
RUN_OPTIONS_DEFAULT[RUN_OPTION_REPLAY] = RUN_OPTION_REPLAY_NOT;
RUN_OPTIONS_DEFAULT[RUN_OPTION_SHOW_BROWSER] = false;
RUN_OPTIONS_DEFAULT[RUN_OPTION_TRACING] = true;
RUN_OPTIONS_DEFAULT[RUN_OPTION_UNRANDOMIZE] = RUN_OPTION_UNRANDOMIZE_CONSTANT;
RUN_OPTIONS_DEFAULT[RUN_OPTION_VIDEO_SCALE_FACTOR] = false;
RUN_OPTIONS_DEFAULT[RUN_OPTION_WARC] = true;
module.exports.RUN_OPTIONS_DEFAULT = RUN_OPTIONS_DEFAULT;

/**
 * Sets the run option to not store a HAR archive.
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionNoHar = function(runOptions) {
  runOptions[RUN_OPTION_HAR] = false;
}
module.exports.setRunOptionNoHar = setRunOptionNoHar;

/**
 * Sets the run option to ignore HTTPS errors.
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionInsecure = function(runOptions) {
  runOptions[RUN_OPTION_INSECURE] = true;
}
module.exports.setRunOptionInsecure = setRunOptionInsecure;

/**
 * Sets the run option to use a proxy server for connecting to the Internet.
 * @param {object} runOptions - The run options object to change
 * @param {string} address - The address of the proxy server to be used for
 * connecting to the Internet (e.g., "http://myproxy.com:3128" or
 * "socks5://myproxy.com:3128")
 */
const setRunOptionProxy = function(runOptions, address) {
  runOptions[RUN_OPTION_PROXY] = address;
}
module.exports.setRunOptionProxy = setRunOptionProxy;

/**
 * Sets the run option to use the WARC of the script or input directory
 * (prefered) to serve requests, failing requests to missing resources.
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionReplayReadOnly = function(runOptions) {
  runOptions[RUN_OPTION_REPLAY] = RUN_OPTION_REPLAY_READ_ONLY;
}
module.exports.setRunOptionReplayReadOnly = setRunOptionReplayReadOnly;

/**
 * Sets the run option to use the WARC of the script or input directory
 * (prefered) to serve requests, recording missing resources.
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionReplayReadWrite = function(runOptions) {
  runOptions[RUN_OPTION_REPLAY] = RUN_OPTION_REPLAY_READ_WRITE;
}
module.exports.setRunOptionReplayReadWrite = setRunOptionReplayReadWrite;

/**
 * Sets the run option to show the browser (i.e., not run headless).
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionShowBrowser = function(runOptions) {
  runOptions[RUN_OPTION_SHOW_BROWSER] = true;
}
module.exports.setRunOptionShowBrowser = setRunOptionShowBrowser;

/**
 * Sets the run option to not store the Playwright trace of the run.
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionNoTracing = function(runOptions) {
  runOptions[RUN_OPTION_TRACING] = false;
}
module.exports.setRunOptionNoTracing = setRunOptionNoTracing;

/**
 * Sets the run option to not change <code>Math.random</code>.
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionUnrandomizeNot = function(runOptions) {
  runOptions[RUN_OPTION_UNRANDOMIZE] = RUN_OPTION_UNRANDOMIZE_NOT;
}
module.exports.setRunOptionUnrandomizeNot = setRunOptionUnrandomizeNot;

/**
 * Sets the run option to overwrite <code>Math.random</code> to always return
 * the same number,
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionUnrandomizeByConstant = function(runOptions) {
  runOptions[RUN_OPTION_UNRANDOMIZE] = RUN_OPTION_UNRANDOMIZE_CONSTANT;
}
module.exports.setRunOptionUnrandomizeByConstant = setRunOptionUnrandomizeByConstant;

/**
 * Sets the run option to store a video of the run.
 * @param {object} runOptions - The run options object to change
 * @param {number} scaleFactor - The scale factor of the recorded video
 */
const setRunOptionVideo = function(runOptions,
    scaleFactor = RUN_OPTION_VIDEO_SCALE_FACTOR_DEFAULT_IF_SET) {
  runOptions[RUN_OPTION_VIDEO_SCALE_FACTOR] = scaleFactor;
}
module.exports.setRunOptionVideo = setRunOptionVideo;

/**
 * Sets the run option to not store a WARC archive of the run.
 * @param {object} runOptions - The run options object to change
 */
const setRunOptionNoWarc = function(runOptions) {
  runOptions[RUN_OPTION_WARC] = false;
}
module.exports.setRunOptionNoWarc = setRunOptionNoWarc;
