#!/usr/bin/env node

// Runs a Scriptor script in a docker container.

const cli = require('../lib/cli.js');
const docker = require('../lib/docker.js');
const log = require('../lib/log.js');

const options = cli.parse(forDocker = true)
const inputDirectory = cli.getInputDirectory(options);
const outputDirectory = cli.getOutputDirectory(options);
cli.getRunOptions(options); // sanity check

const chainable = docker.run(inputDirectory, outputDirectory, options);

