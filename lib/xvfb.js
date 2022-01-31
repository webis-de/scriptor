// Static functions to configure and start a Xvfb instance.

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
const start = async function(logDirectory, width, height) {
  log.info({
    logDirectory: logDirectory,
    width: width,
    height: height
  }, "xvfb.start");

  const commandLog = await processHelpers.openWriteStream(
    path.join(logDirectory, "xvfb.log"), "a");
  const commandErr = await processHelpers.openWriteStream(
    path.join(logDirectory, "xvfb.err"), "a");

  const command = "Xvfb";
  const args = [
    DISPLAY,
    "-screen", "0",
    width + "x" + height + "x16"
  ];
  const env = Object.assign({}, process.env);
  const xvfbOptions = {
    cwd: logDirectory,
    env: env,
    stdio: [ 'pipe', commandLog, commandErr ]
  };

  log.info({ command: command, args: args }, "xvfb.start.spawn");
  const xvfb = child_process.spawn(command, args, xvfbOptions);
  xvfb.on('exit', (code, signal) => {
    if (code !== 0) {
      if (signal === null) {
        log.info({ code: code }, "xvfb.start.error");
        throw new Error("Failed Xvfb");
      } else {
        log.info({ signal: signal }, "xvfb.start.terminated");
      }
    }
  });

  process.on('SIGTERM', (signal) => {
    log.info({ signal: signal }, "xvfb.start.terminate");
    xvfb.kill();
  });

  return xvfb;
}
module.exports.start = start;

