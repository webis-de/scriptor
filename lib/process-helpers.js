const fs = require("fs-extra");
const net = require("net");

/**
 * Opens a file stream to write to.
 * @param {string} file - The file to write to
 * @param {string} mode - The stream mode (default: "w")
 */
const openWriteStream = function(file, mode = "w") {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(file, { flags: mode });
    stream.on("open", () => { resolve(stream); });
    if (!stream.pending) { resolve(stream); }
  });
}

/**
 * Gets an unused port.
 * @returns {Promise<number>} - The port number
 */
const getUnusedPort = async function() {
  const tmpServer = net.createServer((socket) => socket.end());
  return new Promise(resolve => {
    tmpServer.listen(() => {
      const port = tmpServer.address().port;
      tmpServer.close(() => {
        resolve(port);
      });
    });
  });
}

