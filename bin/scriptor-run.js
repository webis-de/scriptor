#!/usr/bin/env node

// Runs a Scriptor script.

const process = require('process');
const fs = require("fs-extra");
const path = require('path');
const os = require('os');

const { cli, files, log, scripts } = require('../lib/index.js');

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

const options = cli.program.parse(process.argv).opts();
log.info({ options: options }, "scriptor-run.options");

const scriptDirectory = getScriptDirectory(options);
const inputDirectory = getInputDirectory(options);
const outputDirectory = getOutputDirectory(options);
const runOptions = getRunOptions(options);

scripts.run(
  scriptDirectory, inputDirectory, outputDirectory, runOptions);

////////////////////////////////////////////////////////////////////////////////
// FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

/**
 * Gets the run options for {@link scripts.run}.
 * @param {object} options - The parsed options
 * @returns {object} - The options to pass to {@link scripts.run}
 */
function getRunOptions(options) {
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

/**
 * Gets the script directory from the parsed command line options.
 * @param {object} options - The parsed options
 * @returns {string} - The script directory path
 */
function getScriptDirectory(options) {
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

/**
 * Gets the input directory from the parsed command line options.
 * @param {object} options - The parsed options
 * @returns {string} - The input directory path or <code>null</code> if none
 */
function getInputDirectory(options) {
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

/**
 * Gets the output directory from the parsed command line options.
 * @param {object} options - The parsed options
 * @returns {string} - The output directory path
 */
function getOutputDirectory(options) {
  const outputDirectory = options.outputDirectory;
  fs.mkdirsSync(outputDirectory);
  if (!fs.statSync(outputDirectory).isDirectory()) {
    throw new Error(
      "output directory '" + outputDirectory + "' is not a directory.");
  }
  return outputDirectory;
};

