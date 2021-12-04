#!/usr/bin/env node

const fs = require("fs-extra");
const os = require("os");
const path = require('path');
const program = require('commander');

const seal = require('../lib/index.js');

////////////////////////////////////////////////////////////////////////////////
// Command line interface
////////////////////////////////////////////////////////////////////////////////

// Declare
program
  .version(seal.constants.VERSION)
  .usage('[options] '
    + '--script-directory <directory> '
    + '--output-directory <directory>')
  .description("Runs a user simulation using the script in --script-directory")
  .requiredOption('-s, --script-directory <directory>',
    'the directory containing the SealScript.js and other run-independent '
    + 'files for the user simulation script')
  .option('-i, --input-directory <directory>',
    'the directory containing files for this specific run; if "-" creates a '
    + 'temporary directory containing a '
    + seal.constants.SCRIPT_CONFIGURATION_FILE + ' read from standard input')
  .requiredOption('-o, --output-directory <directory>',
    'the directory to write the run output to (can later be --input-directory '
    + 'for another run to continue this one)')
  .option('-p, --proxy <address>',
    'use this proxy server for connecting to the Internet (e.g., '
    + '"http://myproxy.com:3128" or "socks5://myproxy.com:3128")')
  .option('-a, --har', 'store a HAR archive of the run')
  .option('-v, --video [scale-factor]',
    'store a video recording of the run, and optionally set its scale factor '
    + 'based on the viewport')
  .option('-t, --tracing', 'store a playwright trace of the run')
  .option('-x, --insecure', 'ignore HTTPS errors');

// Parse
program.parse(process.argv);
const options = program.opts();
seal.log('start', options);

const scriptDirectory = path.resolve(options.scriptDirectory);
const inputDirectory = getInputDirectory(options);
const outputDirectory = options.outputDirectory;
const runOptions = getRunOptions(options);

// Run
const script = seal.scripts.instantiate(scriptDirectory, inputDirectory);
script.start(outputDirectory, runOptions);

// Done


////////////////////////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////////////////////////

function getInputDirectory(options) {
  if (options.inputDirectory !== "-") {
    return options.inputDirectory;
  } else {
    const inputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "seal-input-"));
    const configurationString = fs.readFileSync(0); // read from STDIN
    const configurationFile =
      path.join(inputDirectory, seal.constants.SCRIPT_CONFIGURATION_FILE);
    seal.log("temporary-input-directory", {
      file: configurationFile,
      configuration: JSON.parse(configurationString)
    });
    fs.writeFileSync(configurationFile, configurationString);
    return inputDirectory;
  }
}

function getRunOptions(options) {
  const runOptions = {};
  if (options.proxy !== undefined) {
    runOptions[seal.constants.RUN_OPTION_PROXY] = options.proxy;
  }
  if (options.har !== undefined) {
    runOptions[seal.constants.RUN_OPTION_HAR] = true;
  }
  if (options.video !== undefined) {
    if (options.video === true) {
      runOptions[seal.constants.RUN_OPTION_VIDEO_SCALE_FACTOR] =
        seal.constants.RUN_OPTION_VIDEO_SCALE_FACTOR_DEFAULT;
    } else {
      runOptions[seal.constants.RUN_OPTION_VIDEO_SCALE_FACTOR] =
        parseFloat(options.video);
    }
  }
  if (options.tracing !== undefined) {
    runOptions[seal.constants.RUN_OPTION_TRACING] = true;
  }
  if (options.insecure !== undefined) {
    runOptions[seal.constants.RUN_OPTION_INSECURE] = true;
  }
  seal.log("run-options", runOptions);
  return runOptions;
}

