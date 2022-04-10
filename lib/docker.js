// Static functions to run scriptor-run in Docker

const child_process = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const process = require('process');
const readline = require('readline');

const cli = require('../lib/cli.js');
const files = require('../lib/files.js');
const log = require('../lib/log.js');
const runopts = require('./run-options');

/**
 * Runs a Scriptor script in Docker, possibly chaining multiple runs.
 * @param {object} options - The parsed options
 * @returns {Promise<boolean>} - Whether the script could be called again with the
 * output directory as a new input directory
 */
const run = async function(options) {
  const runOptions = cli.getRunOptions(options);
  const chainActive = (runOptions[runopts.CHAIN_NAME] !== undefined);

  if (chainActive) {
    for (let run = 1; true; ++run) {
    const inputDirectory = cli.getInputDirectory(options);
    const outputDirectory = cli.getOutputDirectory(options);
      log.info({
        run: run,
        inputDirectory: inputDirectory,
        outputDirectory: outputDirectory
      }, "run.chain");
      const chainable =
        await runOnceSafe(inputDirectory, outputDirectory, options);
      if (!chainable) {
        log.info("run.chain.complete");
        return false;
      }
    }
  } else {
    const inputDirectory = cli.getInputDirectory(options);
    const outputDirectory = cli.getOutputDirectory(options);
    return await runOnceSafe(inputDirectory, outputDirectory, options);
  }
}
module.exports.run = run;

////////////////////////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////////////////////////

/**
 * Runs a Scriptor script in Docker, catching all errors.
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script, or <code>null</code>
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @param {object} options - The parsed options
 * @returns {boolean} - Whether the script could be called again with the
 * output directory as a new input directory
 */
const runOnceSafe = function(inputDirectory, outputDirectory, options) {
  return runOnce(inputDirectory, outputDirectory, options).catch((error) => {
    log.fatal(error);
    return false;
  });
}

/**
 * Runs a Scriptor script in Docker.
 * @param {string|null} inputDirectory - The directory that contains the
 * run-dependent files for the script, or <code>null</code>
 * @param {string} outputDirectory - The directory to which all output of the
 * script run should be written to
 * @param {object} options - The parsed options
 * @returns {Promise<boolean>} - Whether the script could be called again with the
 * output directory as a new input directory
 */
const runOnce = async function(inputDirectory, outputDirectory, options) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const logDirectory = path.join(outputDirectory, files.LOGS_DIRECTORY);
  fs.mkdirSync(logDirectory);
  const logStream =
    fs.createWriteStream(path.join(logDirectory, "scriptor.log"));

  const command = "docker";
  const dockerArgs = getArgs(inputDirectory, outputDirectory, options);
  const dockerOptions = {
    stdio: ["inherit", "pipe", "inherit"]
  };

  log.info({ args: dockerArgs, options: dockerOptions }, "docker.run");
  const docker = child_process.spawn(command, dockerArgs, dockerOptions);
  const timeout = createTimeout(options, docker);

  const stdoutListener = readline.createInterface(docker.stdout);
  chainable = false;
  stdoutListener.on("line", (line) => {
    try {
      const json = JSON.parse(line);
      if (json.msg === "scripts.run.cleanup") {
        if (json.chainable === true) {
          chainable = true;
        }
      }
    } catch (error) {}
    process.stdout.write(line + "\n");
    logStream.write(line + "\n");
  });

  process.on('SIGINT', (signal) => {
    if (docker.exitCode !== null) {
      log.info({ signal: signal }, "docker.run.terminate");
      docker.kill();
    }
  });

  return await new Promise(resolve => {
    docker.on("exit", (code) => {
      log.info({code: code, chainable: chainable}, "docker.run.exit");
      if (timeout !== null) { clearTimeout(timeout); }
      logStream.end();
      resolve(chainable);
    });
  });
}

/**
 * Create a timeout for a child process.
 * @param {object} options - The parsed options
 * @param {Subprocess} child - The process to kill on timeout
 * @returns {Timeout} - The timeout object
 */
const createTimeout = function(options, child) {
  const timeoutMilliseconds = cli.getTimeout(options);
  if (timeoutMilliseconds === null) {
    return null;
  } else {
    log.info({ timeout: timeoutMilliseconds }, "docker.createTimeout");
    return setTimeout(() => {
      log.info("docker.createTimeout.kill");
      child.kill();
    }, timeoutMilliseconds);
  }
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
  const runOptions = cli.getRunOptions(options);
  const chainActive = (runOptions[runopts.CHAIN_NAME] !== undefined);
  let mainOutputDirectory = path.resolve(outputDirectory);
  if (chainActive) { mainOutputDirectory = path.dirname(mainOutputDirectory); }

  const scriptDirectory = cli.getScriptDirectory(options);
  const baseArgs = [
    "run", "--interactive", "--init", "--rm",
    "--volume", mainOutputDirectory + ":/output"
  ];
  if (scriptDirectory !== null) {
    baseArgs.push("--volume");
    baseArgs.push(path.resolve(scriptDirectory) + ":/script:ro");
  }
  if (inputDirectory !== null) {
    baseArgs.push("--volume");
    baseArgs.push(path.resolve(inputDirectory) + ":/input:ro");
  }
  const exposedPorts = cli.getDockerExposedPorts(options);
  for (const exposedPort of exposedPorts) {
    baseArgs.push("--publish");
    baseArgs.push(exposedPort);
  }
  baseArgs.push(IMAGE + ":" + cli.getDockerImageTag(options));
  const args = baseArgs.concat(cli.getEntrypointArgs(options));
  return args;
}

