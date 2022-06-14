// Static functions to configure and start a pywb instance.

const child_process = require('child_process');
const process = require('process');
const fs = require("fs-extra");
const path = require("path");

const log = require("./log");
const processHelpers = require("./process-helpers");

/**
 * Default name for the created and used pywb collection.
 */
const COLLECTION_NAME_DEFAULT = "scriptor";
module.exports.COLLECTION_DIRECTORY =
  path.join("collections", COLLECTION_NAME_DEFAULT, "archive");

/**
 * Initializes the pywb directory structure.
 * @param {string} pywbDirectory - The directory to initialize pywb in (will be
 * created if it does not exist yet)
 * @param {string} collectionName - The name of the pywb collection to create
 * and subsequently use
 * @param {number} timeoutInMilliseconds - The maximum number of milliseconds to
 * wait for initialization to finish (else an error is thrown)
 */
const initialize = async function(
    pywbDirectory,
    collectionName = COLLECTION_NAME_DEFAULT,
    timeoutInMilliseconds = 10 * 1000) {
  fs.ensureDirSync(pywbDirectory);

  const commandLog = await processHelpers.openWriteStream(
    path.join(pywbDirectory, "pywb-initialize.log"), "a");
  const commandErr = await processHelpers.openWriteStream(
    path.join(pywbDirectory, "pywb-initialize.err"), "a");

  const command = "wb-manager";
  const args = ["init", collectionName];
  const pywbOptions = {
    cwd: pywbDirectory,
    timeout: timeoutInMilliseconds,
    stdio: [ 'pipe', commandLog, commandErr ]
  };

  log.info({ command: command, args: args }, "pywb.initialize.spawn");
  const wbManager = child_process.spawnSync(command, args, pywbOptions);
  if (wbManager.status !== 0) {
    throw new Error("Failed to initialize wayback collection");
  }

  const config = "proxy:\n"
               + "  enable_content_rewrite: false\n";
  fs.writeFileSync(path.join(pywbDirectory, "config.yaml"), config);
}
module.exports.initialize = initialize;

/**
 * Re-indexes all warc files in the pywb directory structure.
 * @param {string} pywbDirectory - The directory of pywb
 * @param {string} collectionName - The name of the pywb collection to re-index
 * @param {number} timeoutInMilliseconds - The maximum number of milliseconds to
 * wait for re-indexing to finish (else an error is thrown)
 */
const reIndex = async function(
    pywbDirectory,
    collectionName = COLLECTION_NAME_DEFAULT,
    timeoutInMilliseconds = 10 * 1000) {
  const commandLog = await processHelpers.openWriteStream(
    path.join(pywbDirectory, "pywb-reindex.log"), "a");
  const commandErr = await processHelpers.openWriteStream(
    path.join(pywbDirectory, "pywb-reindex.err"), "a");

  const command = "wb-manager";
  const args = ["reindex", collectionName];
  const pywbOptions = {
    cwd: pywbDirectory,
    timeout: timeoutInMilliseconds,
    stdio: [ 'pipe', commandLog, commandErr ]
  };

  log.info({ command: command, args: args }, "pywb.reindex.spawn");
  const wbManager = child_process.spawnSync(command, args, pywbOptions);
  if (wbManager.status !== 0) {
    throw new Error("Failed to re-index wayback collection");
  }
}
module.exports.reIndex = reIndex;

/**
 * Starts the pywb proxy server.
 * @param {string} pywbDirectory - The directory to initialize pywb in (will be
 * created if it does not exist yet)
 * @param {boolean} record - Whether to record new resources.
 * @param {object} options - Options for the server:
 * @param {string} [options.proxy] - The address of the proxy server to be used
 * for connecting to the Internet (e.g., "http://myproxy.com:3128" or
 * "socks5://myproxy.com:3128")
 * @param {string} collectionName - The name of the pywb collection to create
 * and subsequently use
 * @returns {Promise<object>} - An object with the server process object
 * (property: <code>process</code>) and port number (property:
 * <code>port</code>)
 */
const start = async function(
    pywbDirectory, record = true, options = {},
    collectionName = COLLECTION_NAME_DEFAULT) {
  log.info({
    directory: pywbDirectory,
    record: record,
    collectionName: collectionName
  }, "pywb.start");

  const port = await processHelpers.getUnusedPort();
  log.info({ port: port }, "pywb.start.acquiredPort");

  const commandLog = await processHelpers.openWriteStream(
    path.join(pywbDirectory, "pywb-start.log"), "a");
  const commandErr = await processHelpers.openWriteStream(
    path.join(pywbDirectory, "pywb-start.err"), "a");

  const command = "wayback";
  const args = [
    "--bind", "127.0.0.1",
    "--proxy", collectionName, 
    "--port", port
  ];
  if (record) { args.push("--proxy-record"); }
  const env = Object.assign({}, process.env);
  if (options.proxy !== undefined) {
    // https://pywb.readthedocs.io/en/latest/manual/configuring.html#socks-proxy-for-live-web
    const portSeparatorIndex = options.proxy.lastIndexOf(":");
    const proxyHost = options.proxy.substr(0, portSeparatorIndex);
    const proxyPort = parseInt(options.proxy.substr(portSeparatorIndex + 1));
    env["SOCKS_HOST"] = proxyHost;
    env["SOCKS_PORT"] = proxyPort;
  }
  const pywbOptions = {
    cwd: pywbDirectory,
    env: env,
    stdio: [ 'pipe', commandLog, commandErr ]
  };

  log.info({ command: command, args: args }, "pywb.start.spawn");
  const wayback = child_process.spawn(command, args, pywbOptions);
  wayback.on('exit', (code, signal) => {
    if (code !== 0) {
      if (signal === null) {
        log.info({ code: code }, "pywb.start.error");
        throw new Error("Failed proxy");
      } else {
        log.info({ signal: signal }, "pywb.start.terminated");
      }
    }
  });

  process.on('SIGTERM', (signal) => {
    log.info({ signal: signal }, "pywb.start.terminate");
    wayback.kill();
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  return { process: wayback, port: port };
}
module.exports.start = start;

