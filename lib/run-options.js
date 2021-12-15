

/**
 * Boolean option whether to store a HAR archive of the run.
 */
const HAR = "har";
module.exports.HAR = HAR;

/**
 * Boolean option whether to ignore HTTPS errors even when not necessary due to
 * other options.
 */
const INSECURE = "insecure";
module.exports.INSECURE = INSECURE;

/**
 * Object option to specify the upstream proxy to use (absent for none).
 */
const PROXY = "proxy";
module.exports.PROXY = PROXY;

/**
 * String option whether to use the WARC of the script or input directory to
 * serve requests.
 * @see REPLAY_NOT
 * @see REPLAY_READ_ONLY
 * @see REPLAY_READ_WRITE
 */
const REPLAY = "replay";
module.exports.REPLAY = REPLAY;

/**
 * Value for {@link REPLAY} to not use the WARCs but the live
 * Internet (the default).
 */
const REPLAY_NOT = "not";
module.exports.REPLAY_NOT = REPLAY_NOT;

/**
 * Value for {@link REPLAY} to use the WARCs and not record new
 * resources.
 */
const REPLAY_READ_ONLY = "r";
module.exports.REPLAY_READ_ONLY = REPLAY_READ_ONLY;

/**
 * Value for {@link REPLAY} to use (a copy of the) WARCs and also
 * record new resources.
 */
const REPLAY_READ_WRITE = "rw";
module.exports.REPLAY_READ_WRITE = REPLAY_READ_WRITE;

/**
 * Default value for {@link REPLAY} if the option is set.
 */
const REPLAY_DEFAULT_IF_SET = REPLAY_READ_ONLY;
module.exports.REPLAY_DEFAULT_IF_SET = REPLAY_DEFAULT_IF_SET;

/**
 * Boolean option whether to show the browser (i.e., not headless).
 */
const SHOW_BROWSER = "showBrowser";
module.exports.SHOW_BROWSER = SHOW_BROWSER;

/**
 * Boolean option whether to store a Playwright trace of the run.
 */
const TRACING = "tracing";
module.exports.TRACING = TRACING;

/**
 * String option how (and if) to change <code>Math.random</code>.
 * @see UNRANDOMIZE_CONSTANT
 * @see UNRANDOMIZE_NOT
 */
const UNRANDOMIZE = "unrandomize";
module.exports.UNRANDOMIZE = UNRANDOMIZE;

/**
 * Value for {@link UNRANDOMIZE} to not change
 * <code>Math.random</code>.
 */
const UNRANDOMIZE_NOT = "not";
module.exports.UNRANDOMIZE_NOT = UNRANDOMIZE_NOT;

/**
 * Value for {@link UNRANDOMIZE} to overwrite <code>Math.random</code>
 * to always return the same number.
 */
const UNRANDOMIZE_CONSTANT = "constant";
module.exports.UNRANDOMIZE_CONSTANT = UNRANDOMIZE_CONSTANT;

/**
 * Boolean | number option whether to store a video recording of the run and at
 * which scale factor.
 */
const VIDEO_SCALE_FACTOR = "video";
module.exports.VIDEO_SCALE_FACTOR = VIDEO_SCALE_FACTOR;

/**
 * Default value for {@link VIDEO_SCALE_FACTOR} if the option is set.
 */
const VIDEO_SCALE_FACTOR_DEFAULT_IF_SET = 1.0;
module.exports.VIDEO_SCALE_FACTOR_DEFAULT_IF_SET = VIDEO_SCALE_FACTOR_DEFAULT_IF_SET;

/**
 * Boolean option whether to store a WARC archive of the run.
 */
const WARC = "warc";
module.exports.WARC = WARC;

/**
 * Default run options.
 */
const DEFAULT = {};
DEFAULT[HAR] = true;
DEFAULT[INSECURE] = false;
DEFAULT[PROXY] = false;
DEFAULT[REPLAY] = REPLAY_NOT;
DEFAULT[SHOW_BROWSER] = false;
DEFAULT[TRACING] = true;
DEFAULT[UNRANDOMIZE] = UNRANDOMIZE_CONSTANT;
DEFAULT[VIDEO_SCALE_FACTOR] = false;
DEFAULT[WARC] = true;
module.exports.DEFAULT = DEFAULT;

/**
 * Sets the run option to not store a HAR archive.
 * @param {object} runOptions - The run options object to change
 */
const setNoHar = function(runOptions) {
  runOptions[HAR] = false;
}
module.exports.setNoHar = setNoHar;

/**
 * Sets the run option to ignore HTTPS errors.
 * @param {object} runOptions - The run options object to change
 */
const setInsecure = function(runOptions) {
  runOptions[INSECURE] = true;
}
module.exports.setInsecure = setInsecure;

/**
 * Sets the run option to use a proxy server for connecting to the Internet.
 * @param {object} runOptions - The run options object to change
 * @param {string} address - The address of the proxy server to be used for
 * connecting to the Internet (e.g., "http://myproxy.com:3128" or
 * "socks5://myproxy.com:3128")
 */
const setProxy = function(runOptions, address) {
  runOptions[PROXY] = address;
}
module.exports.setProxy = setProxy;

/**
 * Sets the run option to use the WARC of the script or input directory
 * (prefered) to serve requests, failing requests to missing resources.
 * @param {object} runOptions - The run options object to change
 */
const setReplayReadOnly = function(runOptions) {
  runOptions[REPLAY] = REPLAY_READ_ONLY;
}
module.exports.setReplayReadOnly = setReplayReadOnly;

/**
 * Sets the run option to use the WARC of the script or input directory
 * (prefered) to serve requests, recording missing resources.
 * @param {object} runOptions - The run options object to change
 */
const setReplayReadWrite = function(runOptions) {
  runOptions[REPLAY] = REPLAY_READ_WRITE;
}
module.exports.setReplayReadWrite = setReplayReadWrite;

/**
 * Sets the run option to show the browser (i.e., not run headless).
 * @param {object} runOptions - The run options object to change
 */
const setShowBrowser = function(runOptions) {
  runOptions[SHOW_BROWSER] = true;
}
module.exports.setShowBrowser = setShowBrowser;

/**
 * Sets the run option to not store the Playwright trace of the run.
 * @param {object} runOptions - The run options object to change
 */
const setNoTracing = function(runOptions) {
  runOptions[TRACING] = false;
}
module.exports.setNoTracing = setNoTracing;

/**
 * Sets the run option to not change <code>Math.random</code>.
 * @param {object} runOptions - The run options object to change
 */
const setUnrandomizeNot = function(runOptions) {
  runOptions[UNRANDOMIZE] = UNRANDOMIZE_NOT;
}
module.exports.setUnrandomizeNot = setUnrandomizeNot;

/**
 * Sets the run option to overwrite <code>Math.random</code> to always return
 * the same number,
 * @param {object} runOptions - The run options object to change
 */
const setUnrandomizeByConstant = function(runOptions) {
  runOptions[UNRANDOMIZE] = UNRANDOMIZE_CONSTANT;
}
module.exports.setUnrandomizeByConstant = setUnrandomizeByConstant;

/**
 * Sets the run option to store a video of the run.
 * @param {object} runOptions - The run options object to change
 * @param {number} scaleFactor - The scale factor of the recorded video
 */
const setVideo = function(runOptions,
    scaleFactor = VIDEO_SCALE_FACTOR_DEFAULT_IF_SET) {
  runOptions[VIDEO_SCALE_FACTOR] = scaleFactor;
}
module.exports.setVideo = setVideo;

/**
 * Sets the run option to not store a WARC archive of the run.
 * @param {object} runOptions - The run options object to change
 */
const setNoWarc = function(runOptions) {
  runOptions[WARC] = false;
}
module.exports.setNoWarc = setNoWarc;
