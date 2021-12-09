// Static functions to run scriptor-run in Docker

const child_process = require('child_process');
const path = require('path');
const process = require('process');
const readline = require('readline');

const cli = require('../lib/cli.js');
const log = require('../lib/log.js');

const run = async function(options) {
  cli.getRunOptions(options); // sanity check

}
module.exports.run = run;

////////////////////////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////////////////////////

/**
 * Runs a Scriptor script in Docker.
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script, or <code>null</code>
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @param {object} options - The parsed options
 * @returns {boolean} - Whether the script could be called again with the
 * output directory as a new input directory
 */
const runOnce = async function(inputDirectory, outputDirectory, options) {
  const command = "docker";
  const dockerArgs = getArgs(inputDirectory, outputDirectory, options);
  const dockerOptions = {
    stdio: ["inherit", "inherit", "pipe"]
  };

  const timeoutMilliseconds = cli.getTimeout(options);
  if (timeoutMilliseconds !== null) {
    dockerOptions["timeout"] = timeoutMilliseconds;
  }

  log.info({ args: dockerArgs }, "docker.run");
  const docker = child_process.spawn(command, dockerArgs, dockerOptions);

  const stderrListener = readline.createInterface(docker.stderr);
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

  return await new Promise(resolve => {
    docker.on("exit", (code, signal) => {
      log.info({code: code, signal: signal, chainable: chainable}, "docker.run.exit");
      resolve(chainable);
    });
  });
}

/**
 * Docker image of Scriptor.
 */
const IMAGE = "ghcr.io/webis-de/scriptor";

/**
 * Gets the command arguments to pass to docker
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script, or <code>null</code>
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @param {object} options - The parsed options
 * @returns {array} - The arguments to pass on
 */
const getArgs = function(inputDirectory, outputDirectory, options) {
  const scriptDirectory = cli.getScriptDirectory(options);
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
  baseArgs.push(IMAGE + ":" + cli.getDockerImageTag(options));
  const args = baseArgs.concat(cli.getEntrypointArgs(options));
  return args;
}

