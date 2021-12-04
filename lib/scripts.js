// Static functions to run Scriptor scripts.

const fs = require("fs-extra");
const path = require("path");
const playwright = require('playwright');

const files = require("./files");
const log = require("./log");
const pywb = require("./pywb");

////////////////////////////////////////////////////////////////////////////////
// RUN OPTIONS
////////////////////////////////////////////////////////////////////////////////

/**
 * Boolean option whether to store a HAR archive of the run.
 */
const RUN_OPTION_HAR = "har";

/**
 * Boolean option whether to ignore HTTPS errors even when not necessary due to
 * other options.
 */
const RUN_OPTION_INSECURE = "insecure";

/**
 * Object option to specify the upstream proxy to use (absent for none).
 */
const RUN_OPTION_PROXY = "proxy";

/**
 * String option whether to use the WARC of the script or input directory to
 * serve requests.
 * @see RUN_OPTION_REPLAY_NOT
 * @see RUN_OPTION_REPLAY_READ_ONLY
 * @see RUN_OPTION_REPLAY_READ_WRITE
 */
const RUN_OPTION_REPLAY = "replay";

/**
 * Value for {@link RUN_OPTION_REPLAY} to not use the WARCs but the live
 * Internet (the default).
 */
const RUN_OPTION_REPLAY_NOT = "not";

/**
 * Value for {@link RUN_OPTION_REPLAY} to use the WARCs and not record new
 * resources.
 */
const RUN_OPTION_REPLAY_READ_ONLY = "r";

/**
 * Value for {@link RUN_OPTION_REPLAY} to use (a copy of the) WARCs and also
 * record new resources.
 */
const RUN_OPTION_REPLAY_READ_WRITE = "rw";

/**
 * Default value for {@link RUN_OPTION_REPLAY} if the option is set.
 */
const RUN_OPTION_REPLAY_DEFAULT_IF_SET = RUN_OPTION_REPLAY_READ_ONLY;

/**
 * Boolean option whether to show the browser (i.e., not headless).
 */
const RUN_OPTION_SHOW_BROWSER = "showBrowser";

/**
 * Boolean option whether to store a Playwright trace of the run.
 */
const RUN_OPTION_TRACING = "tracing";

/**
 * String option how (and if) to change <code>Math.random</code>.
 * @see RUN_OPTION_UNRANDOMIZE_CONSTANT
 * @see RUN_OPTION_UNRANDOMIZE_NOT
 */
const RUN_OPTION_UNRANDOMIZE = "unrandomize";

/**
 * Value for {@link RUN_OPTION_UNRANDOMIZE} to not change
 * <code>Math.random</code>.
 */
const RUN_OPTION_UNRANDOMIZE_NOT = "not";

/**
 * Value for {@link RUN_OPTION_UNRANDOMIZE} to overwrite <code>Math.random</code>
 * to always return the same number.
 */
const RUN_OPTION_UNRANDOMIZE_CONSTANT = "constant";

/**
 * Boolean | number option whether to store a video recording of the run and at
 * which scale factor.
 */
const RUN_OPTION_VIDEO_SCALE_FACTOR = "video";

/**
 * Default value for {@link RUN_OPTION_VIDEO_SCALE_FACTOR} if the option is set.
 */
const RUN_OPTION_VIDEO_SCALE_FACTOR_DEFAULT_IF_SET = 1.0;

/**
 * Boolean option whether to store a WARC archive of the run.
 */
const RUN_OPTION_WARC = "warc";

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


////////////////////////////////////////////////////////////////////////////////
// RUN
////////////////////////////////////////////////////////////////////////////////

/**
 * Runs a Scriptor script.
 * @param {string} scriptDirectory - The directory that contains the Script.js
 * and other run-independent files for the script
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script, or <code>null</code>
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @param {object} runOptions - All options for the script run
 * @returns {boolean} - Whether the script could be called again with the
 * output directory as a new input directory
 */
const run = async function(
    scriptDirectory, inputDirectory, outputDirectory, runOptions = {}) {
  const opts = Object.assign({}, RUN_OPTIONS_DEFAULT, runOptions);
  log.info({ runOptions: opts }, "scripts.run.options");

  // check directories
  const checkDirectory = (directory, name) => {
    if (!fs.existsSync(directory)) {
      throw new Error(name + " directory '" + directory + "' does not exist.");
    }
    if (!fs.statSync(directory).isDirectory()) {
      throw new Error(name + " directory '" + directory + "' is not a directory.");
    }
  };
  checkDirectory(scriptDirectory);
  if (inputDirectory !== null) {
    checkDirectory(inputDirectory);
  }
  fs.mkdirsSync(outputDirectory);
  checkDirectory(outputDirectory);

  // prepare
  const script = instantiate(scriptDirectory);
  const browserContexts = instantiateBrowserContexts(
    scriptDirectory, inputDirectory, outputDirectory, opts);

  // execute
  log.info({ contextNames: Object.keys(browserContexts) }, "scripts.run");
  const chainUnfinished = (true === await script.run(
    browserContexts, scriptDirectory, inputDirectory, outputDirectory));

  // clean up
  log.info({ chainUnfinished: chainUnfinished }, "scripts.run.cleanup");
  return Promise.all(Object.keys(browserContexts).map(contextName => {
    const browserContext = browserContexts[contextName];
    return browserContext.close().then(_ => {
      log.info({ contextName: contextName }, "scripts.run.contextClosed");
    });
  })).then(_ => {
    log.info("scripts.run.done");
    return chainUnfinished;
  });
}
module.exports.run = run;

////////////////////////////////////////////////////////////////////////////////
// INSTANTIATE
////////////////////////////////////////////////////////////////////////////////

/**
 * Name of the module in the script directory.
 *
 * The file name is this plus ".js". The module must export a class that
 * extends {@link WebScript}. See the minimal script in
 * {@link https://github.com/webis-de/skriptor/blob/main/scripts/Minimal-0.1.0/Script.js}.
 */
const SCRIPT_MODULE = "Script";

/**
 * Sources a script class from a directory.
 * @param {string} scriptDirectory - The directory that contains the script's
 * code and configuration.
 * @returns {class}
 */
const source = function(scriptDirectory) {
  log.debug({
    scriptDirectory: scriptDirectory
  }, "scripts.source");

  // validate
  if (!fs.existsSync(scriptDirectory)) {
    throw new Error(
      "Script directory '" + scriptDirectory + "' does not exist.");
  }
  if (!fs.statSync(scriptDirectory).isDirectory()) {
    throw new Error(
      "Script directory '" + scriptDirectory + "' is not a directory.");
  }
  const scriptModule = path.join(scriptDirectory, SCRIPT_MODULE);
  const scriptFile = scriptModule + ".js";
  if (!fs.existsSync(scriptFile)) {
    throw new Error("Script file '" + scriptFile + "' does not exist.");
  }

  // execute
  log.debug({
    scriptModule: scriptModule,
    scriptFile: scriptFile
  }, "scripts.source.execute");
  const Script = require(scriptModule);
  log.debug("scripts.source.executed");

  return Script;
}

/**
 * Instantiates a script object after parsing its class.
 * @param {string} scriptDirectory - The directory that contains the Script.js
 * and other run-independent files for the script
 * @returns {AbstractScriptorScript}
 */
const instantiate = function(scriptDirectory) {
  log.debug({
    scriptDirectory: scriptDirectory,
  }, "scripts.instantiate");

  const Script = source(scriptDirectory);

  // execute
  log.debug("scripts.instantiate.execute");
  const script = new Script();
  log.debug("scripts.instantiate.executed");

  return script;
}

////////////////////////////////////////////////////////////////////////////////
// BROWSER CONTEXTS
////////////////////////////////////////////////////////////////////////////////

/**
 * Context option that specified the type of browser to use.
 */
const BROWSER_CONTEXT_OPTION_BROWSER_TYPE = "browserType";

/**
 * Default browser to use unless specified otherwise using
 * {@link BROWSER_CONTEXT_OPTION_BROWSER_TYPE}.
 */
const BROWSER_CONTEXT_OPTION_BROWSER_TYPE_DEFAULT = "chromium";

/**
 * Default width and height for the browser viewport.
 */
const BROWSER_VIEWPORT_DEFAULT = { width: 1280, height: 720 };

/**
 * Name of the file in a browser context directory that contains the run's HAR
 * archive.
 */
const BROWSER_CONTEXT_HAR_FILE = "archive.har";

/**
 * Name of the directory in a browser context directory that contains the
 * run's playwright traces.
 */
const BROWSER_CONTEXT_TRACE_DIRECTORY = "trace";

/**
 * Name of the directory in a browser context directory that contains the user
 * data (cookies, local storage).
 */
const BROWSER_CONTEXT_USER_DATA_DIRECTORY = "userData";

/**
 * Name of the directory in a browser context directory that contains the
 * run's video recordings.
 */
const BROWSER_CONTEXT_VIDEO_DIRECTORY = "video";

/**
 * Name of the directory in a browser context directory that contains the
 * run's pywb setup.
 */
const BROWSER_CONTEXT_WARC_DIRECTORY = "warcs";

/**
 * Creates all browser contexts.
 *
 * Reads the options from the {@link files.BROWSER_CONTEXT_OPTIONS_FILE}s in
 * the respective context directories in the script and input directories
 * (options in the input directory's file overwrite those in the script
 * directory's file).
 *
 * If no context directory in the script and input directories exist, a
 * default-configured browser context with name
 * {@link files.BROWSER_CONTEXT_DEFAULT}) is used.
 * @param {string} scriptDirectory - The directory that contains the Script.js
 * and other run-independent files for the script
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script, or <code>null</code>
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @param {object} runOptions - All options for the script run
 * @returns {object} - For each browser context that should be created, the
 * respective Playwright browser context object (value) by the context's name
 * (key, equal to the context's directory name)
 */
const instantiateBrowserContexts = async function(
    scriptDirectory, inputDirectory, outputDirectory, runOptions = {}) {
  const contextDirectoryNames =
    files.getContextDirectoryNames([scriptDirectory, inputDirectory]);
  if (contextDirectoryNames.length === 0) {
    contextDirectoryNames.push(files.BROWSER_CONTEXT_DEFAULT);
  }

  const browserContexts = {}; 
  return Promise.all(contextDirectoryNames.map(
    contextName => {
      return instantiateBrowserContext(contextName,
          scriptDirectory, inputDirectory, outputDirectory, runOptions)
        .then(browserContext => {
          browserContexts[contextName] = browserContext;
        });
  })).then(_ => browserContexts);
}

/**
 * Creates the browser context with the specified name.
 *
 * Reads the options from the {@link files.BROWSER_CONTEXT_OPTIONS_FILE}s in
 * the respective context directory in the script and input directories
 * (options in the input directory's file overwrite those in the script
 * directory's file).
 * @param {string} contextName - The name of the context to instantiate
 * @param {string} scriptDirectory - The directory that contains the Script.js
 * and other run-independent files for the script
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script, or <code>null</code>
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @param {object} runOptions - All options for the script run
 * @returns {BrowserContext} - The created Playwright browser context
 */
const instantiateBrowserContext = async function(contextName,
    scriptDirectory, inputDirectory, outputDirectory, runOptions = {}) {
  const outputContextDirectory =
    files.getContextDirectory(contextName, outputDirectory);
  fs.mkdirsSync(outputContextDirectory);

  // options
  const browserContextOptions = files.readOptions(files.getExisting(
      files.BROWSER_CONTEXT_OPTIONS_FILE, [ scriptDirectory, inputDirectory ],
      contextName = contextName),
    defaults = { viewport: BROWSER_VIEWPORT_DEFAULT });
  log.info({
    contextName: contextName,
    scriptDirectory: scriptDirectory,
    inputDirectory: inputDirectory,
    browserContextOptions: browserContextOptions
  }, "scripts.instantiateBrowserContext.options.read");
  fs.writeJsonSync(
    path.join(outputContextDirectory, files.BROWSER_CONTEXT_OPTIONS_FILE),
    browserContextOptions);

  // prepare options
  prepare4Insecure(browserContextOptions, runOptions);
  prepare4Proxy(browserContextOptions, runOptions);
  prepare4ShowBrowser(browserContextOptions, runOptions);
  prepare4Har(browserContextOptions, runOptions, outputContextDirectory);
  prepare4Tracing(browserContextOptions, runOptions, outputContextDirectory);
  prepare4Video(browserContextOptions, runOptions, outputContextDirectory);
  prepare4Warc(browserContextOptions, runOptions, outputContextDirectory);
  prepare4Replay(browserContextOptions, runOptions, outputContextDirectory,
    scriptDirectory, inputDirectory);
  const outputUserDataDirectory = prepare4UserData(
    contextName, outputContextDirectory, scriptDirectory, inputDirectory);
  const browserType = getBrowserType(browserContextOptions);
  log.info({
    contextName: contextName,
    browserType: browserType,
    browserContextOptions: browserContextOptions,
    outputUserDataDirectory: outputUserDataDirectory,
    runOptions: runOptions
  }, "scripts.instantiateBrowserContext.options.final");

  // launch
  const browserContext = await playwright[browserType]
    .launchPersistentContext(outputUserDataDirectory, browserContextOptions);

  // further settings
  await Promise.all([
    startTracing(browserContext, runOptions),
    startUnrandomize(browserContext, runOptions)
  ]);

  log.info("scripts.instantiateBrowserContext.done");
  return context;
}

/**
 * Prepares the browser context options for ignoring HTTPS errors as per the run
 * options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 */
const prepare4Insecure = function(browserContextOptions, runOptions) {
  if (runOptions[RUN_OPTION_INSECURE]) {
    log.info({ contextName: contextName }, "scripts.prepare4Insecure");
    browserContextOptions["ignoreHTTPSErrors"] = true;
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the browser context options for setting the upstream proxy as per
 * the run options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 */
const prepare4Proxy = function(browserContextOptions, runOptions) {
  const value = runOptions[RUN_OPTION_PROXY];
  if (value !== false) {
    log.info({
      contextName: contextName,
      proxy: value
    }, "scripts.prepare4Proxy");
    browserContextOptions["proxy"] = { server: value };
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the browser context options for showing the browser as per the run
 * options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 */
const prepare4ShowBrowser = function(browserContextOptions, runOptions) {
  if (runOptions[RUN_OPTION_SHOW_BROWSER]) {
    log.info({ contextName: contextName }, "scripts.prepare4ShowBrowser");
    browserContextOptions["headless"] = false;
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the browser context options and output files for HAR archiving as
 * per the run options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 */
const prepare4Har = function(
    browserContextOptions, runOptions, outputContextDirectory) {
  if (runOptions[RUN_OPTION_HAR]) {
    log.info({ contextName: contextName }, "scripts.prepare4Har");
    browserContextOptions["recordHar"] = {
      path: path.join(outputContextDirectory, BROWSER_CONTEXT_HAR_FILE)
    };
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the browser context options and output files for tracing as per the
 * run options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 */
const prepare4Tracing = function(
    browserContextOptions, runOptions, outputContextDirectory) {
  if (runOptions[RUN_OPTION_TRACING]) {
    log.info({ contextName: contextName }, "scripts.prepare4Tracing");
    browserContextOptions["tracesDir"] =
      path.join(outputContextDirectory, BROWSER_CONTEXT_TRACE_DIRECTORY);
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the browser context options and output files for video recording as
 * per the run options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 */
const prepare4Video = function(
    browserContextOptions, runOptions, outputContextDirectory) {
  const value = runOptions[RUN_OPTION_VIDEO_SCALE_FACTOR];
  if (value !== false) {
    let scaleFactor = RUN_OPTION_VIDEO_SCALE_FACTOR_DEFAULT_IF_SET;
    if (value !== true) { scaleFactor = value; }
    const width = browserContextOptions.viewport.width * scaleFactor;
    const height = browserContextOptions.viewport.height * scaleFactor;
    log.info({
      contextName: contextName,
      scaleFactor: scaleFactor,
      width : width,
      height : height
    }, "scripts.prepare4Video");
    browserContextOptions["recordVideo"] = {
      dir: path.join(outputContextDirectory, BROWSER_CONTEXT_VIDEO_DIRECTORY),
      size: { width: width, height: height }
    };
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the browser context options and output files for WARC archiving as
 * per the run options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 */
const prepare4Warc = async function(
    browserContextOptions, runOptions, outputContextDirectory) {
  if (runOptions[RUN_OPTION_WARC]
      && (runOptions[RUN_OPTION_REPLAY] === RUN_OPTION_REPLAY_NOT)) {
    const record = true;
    const pywbDirectory =
      path.join(outputContextDirectory, BROWSER_CONTEXT_WARC_DIRECTORY);
    await pywb.initialize(pywbDirectory);
    preparePywb(browserContextOptions, record, pywbDirectory);
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the browser context options and output files for replay as per the
 * run options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 * @param {string} scriptDirectory - The directory that contains the Script.js
 * and other run-independent files for the script (read-only)
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script (read-only), or <code>null</code>
 */
const prepare4Replay = async function(
    browserContextOptions, runOptions, outputContextDirectory,
    scriptDirectory, inputDirectory) {
  if (runOptions[RUN_OPTION_REPLAY !== RUN_OPTION_REPLAY_NOT] {
    // copy from input directory
    const contextName = path.basename(outputContextDirectory);
    const sourcePywbDirectories = files.getExisting(
      BROWSER_CONTEXT_WARC_DIRECTORY, [inputDirectory, scriptDirectory],
      contextName = contextName);
    if (sourcePywbDirectories.length == 0) {
      throw new Error("Missing script and input WARC directory");
    }
    const sourcePywbDirectory = sourcePywbDirectories[0];
    const outputPywbDirectory =
      path.join(outputContextDirectory, BROWSER_CONTEXT_WARC_DIRECTORY);
    log.info({
      contextName: contextName,
      from: sourcePywbDirectory,
      to: outputPywbDirectory
    }, "scripts.prepare4Replay.copy");
    fs.copySync(sourcePywbDirectory, outputPywbDirectory);

    // start
    const record =
      (runOptions[RUN_OPTION_REPLAY] === RUN_OPTION_REPLAY_READ_WRITE);
    preparePywb(browserContextOptions, record, pywbDirectory);
    return true;
  } else {
    return false;
  }
}

/**
 * Prepares the pywb server for archiving and/or replay.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {boolean} record - Whether to allow for recording resources from the
 * live web
 * @param {string} pywbDirectory - The directory to initialize pywb in
 */
const preparePywb = async function(
    browserContextOptions, record, pywbDirectory) {
  log.info("scripts.preparePywb");

  // set options
  const pywbOptions = {};
  if (browserContextOptions["proxy"] !== undefined) {
    const proxy = browserContextOptions["proxy"]["server"];
    if (proxy !== undefined) { pywbOptions.proxy = proxy; }
  }

  // start pywb
  const pywbPort =
    await pywb.start(pywbDirectory, record = record, options = pywbOptions);
  log.info({
    contextName: contextName,
    directory: pywbDirectory,
    options: pywbOptions,
    port: pywbPort,
    record: record
  }, "scripts.preparePywb.started");

  browserContextOptions["ignoreHTTPSErrors"] = true;
  browserContextOptions["proxy"] = { server: "http://localhost:" + pywbPort };
}

/**
 * Prepares the user data directory for the browser context.
 * @param {string} contextName - The browser context's name (equal to the
 * context's directory's name)
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 * @param {string} scriptDirectory - The directory that contains the Script.js
 * and other run-independent files for the script (read-only)
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script (read-only), or <code>null</code>
 * @returns {string} - The (created) user data directory within the output
 * context directory
 */
const prepare4UserData = function(
    contextName, outputContextDirectory, scriptDirectory, inputDirectory) {
  const outputUserDataDirectory =
    path.join(outputContextDirectory, BROWSER_CONTEXT_USER_DATA_DIRECTORY);
  for (const baseDirectory of [ inputDirectory, scriptDirectory ]) {
    if (baseDirectory !== null) {
      const sourceUserDataDirectory = path.join(
        files.getContextDirectory(contextName, baseDirectory),
        BROWSER_CONTEXT_USER_DATA_DIRECTORY);
      if (fs.existsSync(sourceUserDataDirectory)) {
        log.info({
          contextName: contextName,
          from: sourceUserDataDirectory,
          to: outputUserDataDirectory
        }, "scripts.prepare4UserData.copy");
        fs.copySync(sourceUserDataDirectory, outputUserDataDirectory);
        break;
      }
    }
  }

  fs.mkdirsSync(outputUserDataDirectory); // still create if not exists yet
  return outputUserDataDirectory;
}

/**
 * Gets the browser type to use as specified in the options.
 * @param {object} browserContextOptions - The options for the browser context
 * @returns {string} The browser type to use
 */
const getBrowserType = function(browserContextOptions) {
  return browserContextOptions[BROWSER_CONTEXT_OPTION_BROWSER_TYPE]
    || BROWSER_CONTEXT_OPTION_BROWSER_TYPE_DEFAULT;
}

/**
 * Starts the tracing for the browser context as per the run options.
 * @param {BrowserContext} browserContext - The Playwright browser context
 * @param {object} runOptions - All options for the script run
 */
const startTracing = async function(browserContext, runOptions) {
  if (runOptions[RUN_OPTION_TRACING]) {
    log.info({ contextName: contextName }, "scripts.startTracing");
    await context.tracing.start(
      { name: "run", screenshots: true, snapshots: true });
    return true;
  } else {
    return false;
  }
}

/**
 * Changes <code>Math.random</code>for the browser context as per the run options.
 * @param {BrowserContext} browserContext - The Playwright browser context
 * @param {object} runOptions - All options for the script run
 * @see https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script
 */
const startUnrandomize = async function(browserContext, runOptions) {
  const value = runOptions[RUN_OPTION_UNRANDOMIZE];
  if (value === RUN_OPTION_UNRANDOMIZE_NOT) {
    return false;
  } else if (value == RUN_OPTION_UNRANDOMIZE_CONSTANT) {
    log.info({ contextName: contextName }, "scripts.startUnrandomize.constant");
    // https://xkcd.com/221/
    await browserContext.addInitScript({
      content: "Math.random = () => 0.4;"
    });
    return true;
  } else {
    throw new Error("Unsupported value for run option '"
      + RUN_OPTION_UNRANDOMIZE + "': '" + value + "'");
  }
}

