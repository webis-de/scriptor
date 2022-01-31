// Static functions to configure and start a VNC server.

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
 * Starts the VNC instance.
 * @param {string} logDirectory - The directory for logging the server output to
 * (will be created if it does not exist yet)
 * @param {string} password = null - An optional password for connecting to the
 * server.
 * @returns {Promise<object>} - The VNC server process object
 */
const start = async function(logDirectory, password = null) {
  log.info({
    logDirectory: logDirectory,
    password: password
  }, "vnc.start");

  const commandLog = await processHelpers.openWriteStream(
    path.join(logDirectory, "vnc.log"), "a");
  const commandErr = await processHelpers.openWriteStream(
    path.join(logDirectory, "vnc.err"), "a");

  const command = "x11vnc";
  const args = [
    "-display", DISPLAY,
    "-N",
    "-forever"
  ];
  if (password !== null) {
    args.push("-passwd");
    args.push(password);
  }
  const env = Object.assign({}, process.env);
  const vncOptions = {
    cwd: logDirectory,
    env: env,
    stdio: [ 'pipe', commandLog, commandErr ]
  };

  log.info({ command: command, args: args }, "vnc.start.spawn");
  const vnc = child_process.spawn(command, args, vncOptions);
  vnc.on('exit', (code, signal) => {
    if (code !== 0) {
      if (signal === null) {
        log.info({ code: code }, "vnc.start.error");
        throw new Error("Failed VNC server");
      } else {
        log.info({ signal: signal }, "vnc.start.terminated");
      }
    }
  });

  process.on('SIGTERM', (signal) => {
    log.info({ signal: signal }, "vnc.start.terminate");
    vnc.kill();
  });

  return vnc;
}
module.exports.start = start;

/**
 * Stops a started VNC server.
 */
const stop = async function() {
  await child_process.spawn("x11vnc", ["--remote", "stop"]);
}
module.exports.stop = stop;

