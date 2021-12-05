const fs = require("fs-extra");
const path = require('path');

const { AbstractScriptorScript, files, pages, log } = require('@webis-de/scriptor');

const NAME = "Snapshot";
const VERSION = "0.1.0";

const SCRIPT_OPTION_URL = "url";
const SCRIPT_OPTIONS_VIEWPORT_ADJUST = "viewportAdjust";
const SCRIPT_OPTIONS_SNAPSHOT = "snapshot";

module.exports = class extends AbstractScriptorScript {

  constructor() {
    super(NAME, VERSION);
  }

  async run(browserContexts, scriptDirectory, inputDirectory, outputDirectory) {
    const browserContext = browserContexts[files.BROWSER_CONTEXT_DEFAULT];

    // Script options
    const defaultScriptOptions = { viewportAdjust: {} };
    const requiredScriptOptions = [ SCRIPT_OPTION_URL ];
    const scriptOptions = files.readOptions(files.getExisting(
      files.SCRIPT_OPTIONS_FILE_NAME, [ scriptDirectory, inputDirectory ]),
      defaultScriptOptions, requiredScriptOptions);
    log.info({options: scriptOptions}, "script.options");

    const url = scriptOptions[SCRIPT_OPTION_URL];
    const optionsViewportAdjust = scriptOptions[SCRIPT_OPTIONS_VIEWPORT_ADJUST];
    const optionsSnapshot = Object.assign(
      { path: path.join(outputDirectory, "snapshot") },
      scriptOptions[SCRIPT_OPTIONS_SNAPSHOT]);

    // Load page
    const page = await browserContext.newPage();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Adapt viewport height to scroll height
    await pages.adjustViewportToPage(page, optionsViewportAdjust);
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Take snapshot
    await pages.takeSnapshot(page, optionsSnapshot);
  }
};

