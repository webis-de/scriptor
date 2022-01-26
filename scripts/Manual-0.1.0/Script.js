const fs = require("fs-extra");
const path = require('path');

const { AbstractScriptorScript, files, pages, log } = require('@webis-de/scriptor');

const NAME = "Manual";
const VERSION = "0.1.0";

const SCRIPT_OPTION_STAY_HEADED = "stayHeaded";

module.exports = class extends AbstractScriptorScript {

  constructor() {
    super(NAME, VERSION);
  }

  async run(browserContexts, scriptDirectory, inputDirectory, outputDirectory) {
    const browserContext = browserContexts[files.BROWSER_CONTEXT_DEFAULT];

    // Script options
    const defaultScriptOptions = { };
    defaultScriptOptions[SCRIPT_OPTION_STAY_HEADED] = false;
    const requiredScriptOptions = [ ];
    const scriptOptions = files.readOptions(files.getExisting(
      files.SCRIPT_OPTIONS_FILE_NAME, [ scriptDirectory, inputDirectory ]),
      defaultScriptOptions, requiredScriptOptions);
    log.info({options: scriptOptions}, "script.options");

    // Start browser and wait
    const page = await browserContext.newPage();
    await page.pause();
    return true;
  }
};

