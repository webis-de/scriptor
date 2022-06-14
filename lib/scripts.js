// Static functions to run Scriptor scripts.

const chmodr = require('chmodr');
const fs = require("fs-extra");
const folderhash = require("folder-hash");
const path = require("path");
const playwright = require('playwright');

const chain = require("./chain");
const cli = require("./cli");
const files = require("./files");
const log = require("./log");
const lwm = require("./lwm");
const pywb = require("./pywb");
const runopts = require('./run-options');
const vnc = require("./vnc");
const xvfb = require("./xvfb");


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
 * @returns {Promise<boolean>} - Whether the script could be called again with the
 * output directory as a new input directory
 */
const run = async function(
    scriptDirectory, inputDirectory, outputDirectory, runOptions = {}) {
  const opts = Object.assign({}, runopts.DEFAULT, runOptions);
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
  fs.mkdirsSync(outputDirectory);
  checkDirectory(outputDirectory);
  if (inputDirectory !== null) {
    checkDirectory(inputDirectory);
    const inputIdFile = path.join(inputDirectory, files.ID_FILE_NAME);
    if (fs.existsSync(inputIdFile)) {
      log.info("scripts.run.copyid");
      fs.copySync(inputIdFile,
        path.join(outputDirectory, files.INPUT_ID_FILE_NAME));
    }
  }

  // prepare
  const script = instantiate(scriptDirectory);
  const browserContexts = await instantiateBrowserContexts(
    scriptDirectory, inputDirectory, outputDirectory, opts);

  // execute
  log.info({ contextNames: Object.keys(browserContexts) }, "scripts.run");
  const execution = script.run(
    browserContexts, scriptDirectory, inputDirectory, outputDirectory)
  .catch((error) => {
    log.fatal(error);
    return false;
  });
  const chainable = (true === await execution);

  // clean up
  log.info({ chainable: chainable }, "scripts.run.cleanup");
  return Promise.all(Object.keys(browserContexts).map(async function(contextName) {
    const browserContext = browserContexts[contextName];
    const outputContextDirectory =
      files.getContextDirectory(contextName, outputDirectory);
    await stopTracing(browserContext, opts, outputContextDirectory);
    return browserContext.close().then(_ => {
      log.info({ contextName: contextName }, "scripts.run.contextClosed");
    });
  })).then(_ => {
    log.info("scripts.run.done");
    return folderhash.hashElement(outputDirectory, {});
  }).then(hash => {
    log.info({ hash: hash.hash }, "scripts.run.hashed");
    fs.writeFileSync(path.join(outputDirectory, files.ID_FILE_NAME), hash.hash);
    log.info("scripts.run.chmod");
    chmodr.sync(outputDirectory, 0o444);
    log.info("scripts.run.chmod.done");
    if (opts[runopts.CHAIN_NAME] !== undefined) {
      chain.stepChainConfiguration(opts[runopts.CHAIN_NAME], outputDirectory);
    }
    return chainable;
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
  log.info({
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
  const scriptModule = path.resolve(path.join(scriptDirectory, SCRIPT_MODULE));
  const scriptFile = scriptModule + ".js";
  if (!fs.existsSync(scriptFile)) {
    throw new Error("Script file '" + scriptFile + "' does not exist.");
  }

  // execute
  log.info({
    scriptModule: scriptModule,
    scriptFile: scriptFile
  }, "scripts.source.execute");
  const Script = require(scriptModule);
  log.info("scripts.source.executed");

  return Script;
}

/**
 * Instantiates a script object after parsing its class.
 * @param {string} scriptDirectory - The directory that contains the Script.js
 * and other run-independent files for the script
 * @returns {AbstractScriptorScript}
 */
const instantiate = function(scriptDirectory) {
  log.info({
    scriptDirectory: scriptDirectory,
  }, "scripts.instantiate");

  const Script = source(scriptDirectory);

  // execute
  log.info("scripts.instantiate.execute");
  const script = new Script();
  log.info("scripts.instantiate.executed");

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
 * run's Playwright traces during the run.
 */
const BROWSER_CONTEXT_TRACE_DIRECTORY = "trace";

/**
 * Name of the file in a browser context directory that contains the run's final
 * Playwright traces.
 */
const BROWSER_CONTEXT_TRACE_FILE = "trace.zip";

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
 * @returns {Promise<object>} - For each browser context that should be created, the
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
  log.info({
      contextNames: contextDirectoryNames
  }, "scripts.instantiateBrowserContexts.names");

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
 * @returns {Promise<BrowserContext>} - The created Playwright browser context
 */
const instantiateBrowserContext = async function(contextName,
    scriptDirectory, inputDirectory, outputDirectory, runOptions = {}) {
  const outputContextDirectory =
    files.getContextDirectory(contextName, outputDirectory);
  fs.mkdirsSync(outputContextDirectory);

  // options
  const browserContextOptions = files.readOptions(files.getExisting(
      files.BROWSER_CONTEXT_OPTIONS_FILE_NAME,
      [ scriptDirectory, inputDirectory ],
      contextName = contextName),
    defaults = { viewport: BROWSER_VIEWPORT_DEFAULT });
  log.info({
    contextName: contextName,
    scriptDirectory: scriptDirectory,
    inputDirectory: inputDirectory,
    browserContextOptions: browserContextOptions
  }, "scripts.instantiateBrowserContext.options.read");
  fs.writeJsonSync(
    path.join(outputContextDirectory, files.BROWSER_CONTEXT_OPTIONS_FILE_NAME),
    browserContextOptions);

  // prepare options
  prepare4Insecure(browserContextOptions, runOptions);
  prepare4Proxy(browserContextOptions, runOptions);
  const showBrowserProcesses = await prepare4ShowBrowser(
    browserContextOptions, runOptions, outputDirectory);
  prepare4Har(browserContextOptions, runOptions, outputContextDirectory);
  prepare4Tracing(browserContextOptions, runOptions, outputContextDirectory);
  prepare4Video(browserContextOptions, runOptions, outputContextDirectory);
  const warcProcess = await prepare4Warc(
    browserContextOptions, runOptions, outputContextDirectory);
  const replayProcess = await prepare4Replay(
    browserContextOptions, runOptions, outputContextDirectory,
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
    startTracing(browserContext, contextName, runOptions, outputContextDirectory),
    startUnrandomize(browserContext, runOptions)
  ]);
  if (showBrowserProcesses !== null) {
    browserContext.on("close", () => {
      log.info({contextName: contextName}, "scripts.onClose.terminateShowBrowserProcesses");
      vnc.stop();
      showBrowserProcesses["lwm"].kill();
    });
  }
  if (warcProcess !== null) {
    browserContext.on("close", () => {
      log.info({contextName: contextName}, "scripts.onClose.terminateWarcProcess");
      warcProcess.kill();
    });
  }
  if (replayProcess !== null) {
    browserContext.on("close", () => {
      log.info({contextName: contextName}, "scripts.onClose.terminateReplayProcess");
      replayProcess.kill();
    });
  }

  log.info("scripts.instantiateBrowserContext.done");
  return browserContext;
}

/**
 * Prepares the browser context options for ignoring HTTPS errors as per the run
 * options.
 * @param {object} browserContextOptions - The options for the browser context
 * @param {object} runOptions - All options for the script run
 */
const prepare4Insecure = function(browserContextOptions, runOptions) {
  if (runOptions[runopts.INSECURE]) {
    log.info("scripts.prepare4Insecure");
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
  const value = runOptions[runopts.PROXY];
  if (value !== false) {
    log.info({
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
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @returns {Promise<object<object>|null>} If a server was started, the server's
 * process objects ("xvfb", "lwm", "vnc"), otherwise <code>null</code>
 */
const prepare4ShowBrowser = async function(
  browserContextOptions, runOptions, outputDirectory) {
  if (runOptions[runopts.SHOW_BROWSER] !== false) {
    const opts = runOptions[runopts.SHOW_BROWSER];
    log.info({ runOptions: opts }, "scripts.prepare4ShowBrowser");
    browserContextOptions["headless"] = false;
    const logDirectory = path.join(outputDirectory, files.LOGS_DIRECTORY);
    fs.mkdirsSync(logDirectory);


    const xvfbProcessPromise = xvfb.start(logDirectory,
      opts[runopts.SHOW_BROWSER_WIDTH], opts[runopts.SHOW_BROWSER_HEIGHT]);
    await (new Promise(resolve => setTimeout(resolve, 1000)));
    const lwmProcessPromise = lwm.start(logDirectory);
    const vncProcessPromise = vnc.start(logDirectory, opts[runopts.SHOW_BROWSER_PASSWORD]);
    await (new Promise(resolve => setTimeout(resolve, 1000)));

    const xvfbProcess = await xvfbProcessPromise;
    const lwmProcess = await lwmProcessPromise;
    const vncProcess = await vncProcessPromise;
    return {
      xvfb: xvfbProcess,
      lwm: lwmProcess,
      vnc: vncProcess
    };
  } else {
    return null;
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
  if (runOptions[runopts.HAR]) {
    log.info("scripts.prepare4Har");
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
  if (runOptions[runopts.TRACING]) {
    log.info("scripts.prepare4Tracing");
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
  const value = runOptions[runopts.VIDEO_SCALE_FACTOR];
  if (value !== false) {
    let scaleFactor = runopts.VIDEO_SCALE_FACTOR_DEFAULT_IF_SET;
    if (value !== true) { scaleFactor = value; }
    const width = browserContextOptions.viewport.width * scaleFactor;
    const height = browserContextOptions.viewport.height * scaleFactor;
    log.info({
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
 * @returns {Promise<object|null>} If a server was started, the server's process
 * object, otherwise <code>null</code>
 */
const prepare4Warc = async function(
    browserContextOptions, runOptions, outputContextDirectory) {
  if (runOptions[runopts.WARC]
      && (runOptions[runopts.REPLAY] === runopts.REPLAY_NOT)) {
    const record = true;
    const pywbDirectory =
      path.join(outputContextDirectory, BROWSER_CONTEXT_WARC_DIRECTORY);
    await pywb.initialize(pywbDirectory);
    return await preparePywb(browserContextOptions, record, pywbDirectory);
  } else {
    return null;
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
 * @returns {Promise<object|null>} If a server was started, the server's process
 * object, otherwise <code>null</code>
 */
const prepare4Replay = async function(
    browserContextOptions, runOptions, outputContextDirectory,
    scriptDirectory, inputDirectory) {
  if (runOptions[runopts.REPLAY] !== runopts.REPLAY_NOT) {
    // copy from input directory
    const contextName = path.basename(outputContextDirectory);
    const sourcePywbDirectories = files.getExisting(
      BROWSER_CONTEXT_WARC_DIRECTORY, [inputDirectory, scriptDirectory],
      contextName);
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
      (runOptions[runopts.REPLAY] === runopts.REPLAY_READ_WRITE);
    return await preparePywb(browserContextOptions, record, outputPywbDirectory);
  } else {
    return null;
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

  // re-index
  await pywb.reIndex(pywbDirectory);

  // set options
  const pywbOptions = {};
  if (browserContextOptions["proxy"] !== undefined) {
    const proxy = browserContextOptions["proxy"]["server"];
    if (proxy !== undefined) { pywbOptions.proxy = proxy; }
  }

  // start pywb
  const pywbData =
    await pywb.start(pywbDirectory, record, pywbOptions);
  log.info({
    directory: pywbDirectory,
    options: pywbOptions,
    port: pywbData.port,
    record: record
  }, "scripts.preparePywb.started");

  browserContextOptions["ignoreHTTPSErrors"] = true;
  browserContextOptions["proxy"] = { server: "http://localhost:" + pywbData.port };
  return await (new Promise(resolve => setTimeout(resolve, 1000))
    .then(_ => pywbData.process));
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
 * @param {string} contextName - The browser context's name (equal to the
 * context's directory's name)
 * @param {object} runOptions - All options for the script run
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 */
const startTracing = async function(
    browserContext, contextName, runOptions, outputContextDirectory) {
  if (runOptions[runopts.TRACING]) {
    log.info("scripts.startTracing");
    await browserContext.tracing.start({
      name: "run",
      screenshots: true,
      snapshots: true,
      sources: true,
      title: contextName
    });
    return true;
  } else {
    return false;
  }
}

/**
 * Stops the tracing for the browser context as per the run options.
 * @param {BrowserContext} browserContext - The Playwright browser context
 * @param {object} runOptions - All options for the script run
 * @param {string} outputContextDirectory - The directory to write the context's
 * data to
 */
const stopTracing = async function(
    browserContext, runOptions, outputContextDirectory) {
  if (runOptions[runopts.TRACING]) {
    const traceDirectory =
      path.join(outputContextDirectory, BROWSER_CONTEXT_TRACE_DIRECTORY);
    const traceFile = path.join(outputContextDirectory, BROWSER_CONTEXT_TRACE_FILE);
    log.info({ from: traceDirectory, to: traceFile }, "scripts.stopTracing");
    await browserContext.tracing.stop({ path: traceFile });
    fs.rmSync(traceDirectory, { recursive: true });
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
  const value = runOptions[runopts.UNRANDOMIZE];
  if (value === runopts.UNRANDOMIZE_NOT) {
    return false;
  } else if (value == runopts.UNRANDOMIZE_CONSTANT) {
    log.info("scripts.startUnrandomize.constant");
    // https://xkcd.com/221/
    await browserContext.addInitScript({
      content: "Math.random = () => 0.4;"
    });
    return true;
  } else {
    throw new Error("Unsupported value for run option '"
      + runopts.UNRANDOMIZE + "': '" + value + "'");
  }
}

