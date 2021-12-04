// Static functions to configure and start a pywb instance.

const commander = require('commander');
const fs = require("fs-extra");
const path = require('path');

const files = require('./files');

const packageInfo = fs.readJsonSync(path.join(__dirname, "..", "package.json"));

/**
 * The Scriptor command line interface.
 */
const program = commander
  .version(packageInfo.version)
  .usage('[options] '
    + '--script-directory <directory> '
    + '--output-directory <directory>')
  .description("Runs a Scriptor web user simulation script.")
  .requiredOption('-s, --script-directory <directory>', 'The directory '
    + 'containing the Script.js and other run-independent files')
  .option('-i, --input-directory <directory>', 'The directory containing files '
    + 'for this specific run; or "-" to use a temporary directory with a '
    + files.SCRIPT_CONFIGURATION_FILE + ' file read from standard input')
  .requiredOption('-o, --output-directory <directory>', 'The directory the run '
    + 'output is written to')
  .option('-r, --replay [mode]', 'Use the WARC web archive of the script or '
    + 'input directory (prefered if exists) to answer the browser requests; '
    + 'Modes: "r" (default if mode is missing) for read-only and "rw" to first '
    + 'copy the web archive to the output directory and then add missing '
    + 'resources to the copy')
  .option('-p, --proxy <address>', 'Use this proxy server for connecting to '
    + 'the Internet (e.g., "http://myproxy.com:3128" or '
    + '"socks5://myproxy.com:3128")')
  .option('-x, --insecure', 'Ignore HTTPS errors (only considered when '
    + '--no-warc is set and --replay is not)')
  .option('-b, --show-browser', 'Show the browser (no headless mode)')
  .option('-u, --unrandomize', 'Specifies how to overwrite Math.random: '
    + '"not" or by a "constant" (default)')
  .option('-v, --video [scale-factor]', 'Store a video recording of the run, '
    + 'and optionally set its scale factor relative to viewport size')
  .option('-a, --no-har', 'Do not store a HAR archive of the run')
  .option('-t, --no-tracing', 'Do not store a playwright trace of the run')
  .option('-w, --no-warc', 'Do not store a WARC web archive of the run');
module.exports.program = program;


