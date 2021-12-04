#!/usr/bin/env node

// Runs a Scriptor script.

const process = require('process');
const scriptor = require('../lib/index.js');

const options = scriptor.cli.program.parse(process.argv);

const scriptDirectory = scriptor.cli.getScriptDirectory(options);
const inputDirectory = scriptor.cli.getInputDirectory(options);
const outputDirectory = scriptor.cli.getOutputDirectory(options);
const runOptions = scriptor.cli.getRunOptions(options);

scriptor.scripts.run(
  scriptDirectory, inputDirectory, outputDirectory, runOptions);

