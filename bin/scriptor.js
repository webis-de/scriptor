#!/usr/bin/env node

// Runs a Scriptor script in a docker container.

const cli = require('../lib/cli.js');
const docker = require('../lib/docker.js');
const log = require('../lib/log.js');

////////////////////////////////////////////////////////////////////////////////
// MAIN
////////////////////////////////////////////////////////////////////////////////

const forDocker = true;
const options = cli.parse(forDocker);
docker.run(options);

