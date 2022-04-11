#!/usr/bin/env node

// Runs a Scriptor script.

const process = require('process');

const cli = require('../lib/cli.js');
const scripts = require('../lib/scripts.js');
const log = require('../lib/log.js');

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

const dockerEntrypoint = true;
const options = cli.parse(dockerEntrypoint);
log.info({ options: options }, "entrypoint");

try {
  const scriptDirectory = cli.getScriptDirectory(options);
  const outputDirectory = cli.getOutputDirectory(options);
  const inputDirectory = cli.getInputDirectory(options, dockerEntrypoint);
  const runOptions = cli.getRunOptions(options);

  scripts
    .run(scriptDirectory, inputDirectory, outputDirectory, runOptions)
    .catch(error => {
      log.fatal(error);
      process.exitCode = 1;
    });
} catch (error) {
  log.fatal(error);
  console.log("\nERROR: " + error.message);
  process.exit(1);
}
