#!/usr/bin/env node

// Runs a Scriptor script in a docker container.

const child_process = require('child_process');
const path = require('path');
const process = require('process');
const readline = require('readline');

const { cli } = require('../lib/index.js');

const options = cli.parse(docker = true)
const scriptDirectory = cli.getScriptDirectory(options);
const inputDirectory = cli.getInputDirectory(options);
const outputDirectory = cli.getOutputDirectory(options);
const entrypointArgs = cli.getEntrypointArgs(options);

const command = "docker";
const baseArgs = [
  "run", "--interactive", "--init", "--rm",
  "--volume", path.resolve(outputDirectory) + ":/output"
];
if (scriptDirectory !== null) {
  baseArgs.push("--volume");
  baseArgs.push(path.resolve(scriptDirectory) + ":/script:ro");
}
if (inputDirectory !== null) {
  baseArgs.push("--volume");
  baseArgs.push(path.resolve(inputDirectory) + ":/input:ro");
}
baseArgs.push(cli.IMAGE);
const dockerArgs = baseArgs.concat(entrypointArgs);
const dockerOptions = {
  stdio: ["inherit", "inherit", "pipe"]
};
const run = child_process.spawn(command, dockerArgs, dockerOptions);
const stderrListener = readline.createInterface(run.stderr);
chainable = false;
stderrListener.on("line", (line) => {
  try {
    const json = JSON.parse(line);
    if (json.msg === "scripts.run.cleanup") {
      if (json.chainable === true) {
        chainable = true;
      }
    }
  } catch (error) {}
  process.stderr.write(line + "\n");
});
run.on("exit", (code) => {
  console.log("chainable: " + chainable);
});

