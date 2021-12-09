// Static functions to run scriptor-run in Docker

const child_process = require('child_process');
const path = require('path');
const process = require('process');
const readline = require('readline');

const cli = require('../lib/cli.js');
const log = require('../lib/log.js');

/**
 * Runs a Scriptor script in Docker, possibly chaining multiple runs.
 * @param {object} options - The parsed options
 * @returns {boolean} - Whether the script could be called again with the
 * output directory as a new input directory
 */
const run = async function(options) {
  cli.getRunOptions(options); // sanity check

  let inputDirectory = cli.getInputDirectory(options);
  const outputDirectory = cli.getOutputDirectory(options);
  const chainConfiguration = cli.getChainConfiguration(options);
  if (chainConfiguration == null) {
    // no chain
    return await runOnceSafe(inputDirectory, outputDirectory, options);
  } else {
    // chain
    const maxRuns = chainConfiguration.max;
    for (let run = 0; maxRuns === undefined || run < maxRuns; ++run) {
      const runNumber = chainConfiguration.start + run;
      const runOutputDirectory = getRunOutputDirectory(
        outputDirectory, chainConfiguration.pattern, runNumber);

      log.info({
        run: run,
        runNumber: runNumber,
        inputDirectory: inputDirectory,
        outputDirectory: runOutputDirectory
      }, "run.chain");
      const chainable =
        await runOnceSafe(inputDirectory, runOutputDirectory, options);
      if (!chainable) {
        log.info("run.chain.complete");
        return false;
      }

      inputDirectory = runOutputDirectory;
    }
    log.info("run.chain.maxRunsReached");
    return true;
  }
}
module.exports.run = run;

////////////////////////////////////////////////////////////////////////////////
// HELPERS
////////////////////////////////////////////////////////////////////////////////

/**
 * Gets the output directory for a single run of a chain.
 * @param {string} outputDirectory - The main directory to place the output
 * directory of each run of a chain into
 * @param {string} pattern - The string pattern of the run specific directory
 * within the output directory, containing at least one substring that matches
 * '%0[0-9]+d"': all such substrings are replaced with the run number formatted
 * accordingly
 * @param {integer} runNumber - The number to put into the pattern
 * @returns {string} - The run specific directory
 */
const getRunOutputDirectory = function(
    outputDirectory, pattern, runNumber) {
  let runDirectoryName = pattern;
  for (match of pattern.matchAll("%0[0-9]+d")) {
    const runNumberString = String(runNumber);
    const numDigits = parseInt(match[0].substr(2, match[0].length - 3));
    const numLeadingZeroes = Math.max(0, numDigits - runNumberString.length);
    const formattedRunNumber = "0".repeat(numLeadingZeroes) + runNumberString;
    runDirectoryName = runDirectoryName.replace(match[0], formattedRunNumber);
  }
  return path.join(outputDirectory, runDirectoryName);
}

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

