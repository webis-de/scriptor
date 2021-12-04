#!/usr/bin/env node

const fs = require("fs-extra");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require('path');
const program = require('commander');
const child_process = require('child_process');

const seal = require('../lib/index.js');

const COLLECTION_NAME = "seal";

////////////////////////////////////////////////////////////////////////////////
// Command line interface
////////////////////////////////////////////////////////////////////////////////

// Declare
program.version(seal.constants.VERSION);
// TODO: distinguish archive and replay

// Parse
program.parse(process.argv);
const options = program.opts();
seal.log('start', options);

const scriptDirectory = "/script";
const inputDirectory = "/input";
const outputDirectory = "/output";

// Run

// Write config from stdin if it is open
if (!process.stdin.isTTY) {
  const configurationString = fs.readFileSync(0); // read from STDIN
  const configurationFile =
    path.join(inputDirectory, seal.constants.SCRIPT_CONFIGURATION_FILE);
  seal.log("config-from-stdin", {
    file: configurationFile,
    configuration: JSON.parse(configurationString)
  });
  fs.writeFileSync(configurationFile, configurationString);
}

// TODO


// Done


////////////////////////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////////////////////////


