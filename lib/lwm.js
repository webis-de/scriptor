// Static functions to configure and start a lwm instance.

const child_process = require('child_process');
const process = require('process');
const path = require("path");

const log = require("./log");
const processHelpers = require("./process-helpers");

/**
 * Display number to use.
 */
const DISPLAY = process.env.DISPLAY;

/**
 * Starts the Xvfb instance.
 * @param {string} logDirectory - The directory for logging the Xvfb output to
 * (will be created if it does not exist yet)
 * @param {number} width - The width of the display in pixels
 * @param {number} height - The height of the display in pixels
 * @returns {Promise<object>} - The Xvfb process object
 */
const start = async function(logDirectory) {
  log.info({
    logDirectory: logDirectory
  }, "lwm.start");

  const commandLog = await processHelpers.openWriteStream(
    path.join(logDirectory, "lwm.log"), "a");
  const commandErr = await processHelpers.openWriteStream(
    path.join(logDirectory, "lwm.err"), "a");

  const command = "lwm";
  const args = [ ];
  const env = Object.assign({}, process.env);
  const lwmOptions = {
    cwd: logDirectory,
    env: env,
    stdio: [ 'pipe', commandLog, commandErr ]
  };

  log.info({ command: command, args: args }, "lwm.start.spawn");
  const lwm = child_process.spawn(command, args, lwmOptions);
  lwm.on('exit', (code, signal) => {
    if (code !== 0) {
      log.info({ signal: signal }, "lwm.start.terminated");
    }
  });

  process.on('SIGTERM', (signal) => {
    log.info({ signal: signal }, "lwm.start.terminate");
    lwm.kill();
  });

  return lwm;
}
module.exports.start = start;

