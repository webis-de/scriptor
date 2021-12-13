#!/usr/bin/env node

// Runs a Scriptor script.

const cli = require('../lib/cli.js');
const log = require('../lib/log.js');
const scripts = require('../lib/scripts.js');

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

const dockerEntrypoint = true;
const options = cli.parse(dockerEntrypoint);
log.info({ options: options }, "scriptor-run.options");

const scriptDirectory = cli.getScriptDirectory(options);
const inputDirectory = cli.getInputDirectory(options, dockerEntrypoint);
const outputDirectory = cli.getOutputDirectory(options);
const runOptions = cli.getRunOptions(options);

scripts.run(
  scriptDirectory, inputDirectory, outputDirectory, runOptions);
