// Static functions for handling chain runs of scriptor

const fs = require("fs-extra");
const path = require('path');

const log = require("./log");

/**
 * Reads the chain configuration from file.
 * @param {string} chainName - The name of the chain configuratio file without
 * <code>.json</code> suffix 
 * @param {string} outputDirectory - The overall output directory path (the
 * directory that contains the chain configuration file and chain output
 * directories)
 * @returns {object} - The configuration (empty if the file does not exist)
 */
const getChainConfiguration = function(chainName, outputDirectory) {
  const chainConfigurationFile = path.join(outputDirectory, chainName + ".json");
  if (!fs.existsSync(chainConfigurationFile)) { return {}; }
  const fileContent = fs.readFileSync(chainConfigurationFile, "utf8");
  return JSON.parse(fileContent);
}

/**
 * Gets the index number for the next run in the chain.
 * @param {object} chainConfiguration - The read chain configuration
 * @returns {number} - The incex number
 */
const getNextChainIndex = function(chainConfiguration) {
  if (chainConfiguration.nextIndex === undefined) {
    return 1;
  } else if (typeof(chainConfiguration.nextIndex) !== "number") {
    throw new Error("chain nextIndex is not a positive integer but a "
        + typeof(chainConfiguration.nextIndex));
  } else if (!Number.isInteger(chainConfiguration.nextIndex)
      || chainConfiguration.nextIndex < 1) {
    throw new Error("chain nextIndex is not a positive integer but "
        + chainConfiguration.nextIndex);
  } else{
    return chainConfiguration.nextIndex;
  }
}

/**
 * Gets the input directory from the chain configuration.
 * @param {string} chainName - The name of the chain configuratio file without
 * <code>.json</code> suffix 
 * @param {string} outputDirectory - The overall output directory path (the
 * directory that contains the chain configuration file and chain output
 * directories)
 * @returns {string|null} - The input directory path or <code>null</code> for
 * none
 */
const getChainInputDirectory = function(chainName, outputDirectory) {
  const chainConfiguration = getChainConfiguration(chainName, outputDirectory);
  if (chainConfiguration.previous === undefined) {
    return null;
  } else {
    return path.join(outputDirectory, chainConfiguration.previous);
  }
};
module.exports.getChainInputDirectory = getChainInputDirectory;

/**
 * Gets the output directory from the chain configuration.
 * @param {string} chainName - The name of the chain configuratio file without
 * <code>.json</code> suffix 
 * @param {string} outputDirectory - The overall output directory path (the
 * directory that contains the chain configuration file and chain output
 * directories)
 * @param {number} numDigits - The number of digits (leading zeroes) to use for
 * the run index in the chain output directory's name
 * @returns {string} - The output directory path
 */
const getChainOutputDirectory = function(
    chainName, outputDirectory, numDigits = 9) {
  const nextIndex = getNextChainIndex(
      getChainConfiguration(chainName, outputDirectory));
  const nextIndexString = String(nextIndex);
  const numLeadingZeroes = Math.max(0, numDigits - nextIndexString.length);
  const chainOutputDirectory = path.join(outputDirectory,
    chainName + "-" + "0".repeat(numLeadingZeroes) + nextIndexString);
  return chainOutputDirectory;
};
module.exports.getChainOutputDirectory = getChainOutputDirectory;

/**
 * Configures the chain configuration file for the next run in the chain.
 * @param {string} chainName - The name of the chain configuratio file without
 * <code>.json</code> suffix 
 * @param {string} chainOutputDirectory - The chain output directory of the run
 * that just finished
 */
const stepChainConfiguration = function(chainName, chainOutputDirectory) {
  const outputDirectory = path.dirname(chainOutputDirectory);
  const chainConfiguration = getChainConfiguration(chainName, outputDirectory);
  chainConfiguration.nextIndex = getNextChainIndex(chainConfiguration) + 1;
  chainConfiguration.previous = path.basename(chainOutputDirectory);

  const chainConfigurationFile = path.join(outputDirectory, chainName + ".json");
  log.info({
    chainConfigurationFile: chainConfigurationFile,
    chainConfiguration: chainConfiguration
  }, "chain.stepChainConfiguration");
  fs.writeFileSync(chainConfigurationFile, JSON.stringify(chainConfiguration));
}
module.exports.stepChainConfiguration = stepChainConfiguration;

