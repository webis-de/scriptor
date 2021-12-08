#!/usr/bin/env node

// Runs a Scriptor script.

const { cli, log, scripts } = require('../lib/index.js');

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

const options = cli.parse();
log.info({ options: options }, "scriptor-run.options");

const scriptDirectory = cli.getScriptDirectory(options);
const inputDirectory = cli.getInputDirectory(options);
const outputDirectory = cli.getOutputDirectory(options);
const runOptions = cli.getRunOptions(options);

scripts.run(
  scriptDirectory, inputDirectory, outputDirectory, runOptions);
