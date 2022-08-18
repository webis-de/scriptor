const fs = require("fs-extra");
const path = require('path');

const { AbstractScriptorScript, files, pages, log } = require('@webis-de/scriptor');

const NAME = "Snapshot";
const VERSION = "0.2.0";

const SCRIPT_OPTION_URL = "url";                                           // Required. Set the URL to load.
const SCRIPT_OPTIONS_VIEWPORT_ADJUST = "viewportAdjust";                   // Optional. Passed to pages.adjustViewportToPage before taking the snapshot
const SCRIPT_OPTIONS_SNAPSHOT = "snapshot";                                // Optional. Passed to pages.takeSnapshot for taking the snapshot
const SCRIPT_OPTION_WAIT_EVENT = "waitEvent";                              // Optional. The event to wait for before adjusting the viewport. Use 'domcontentloaded' to *not* wait for external resources. Default: 'load'
const SCRIPT_OPTION_WAIT_NETWORK_MILLISECONDS = "waitNetworkMilliseconds"; // Optional. The number of milliseconds to wait before adjusting the viewport and (again) taking the snapshot. Default: 30000

module.exports = class extends AbstractScriptorScript {

  constructor() {
    super(NAME, VERSION);
  }

  async run(browserContexts, scriptDirectory, inputDirectory, outputDirectory) {
    const browserContext = browserContexts[files.BROWSER_CONTEXT_DEFAULT];

    // Define script options
    const requiredScriptOptions = [ SCRIPT_OPTION_URL ];
    const defaultScriptOptions = {};
    defaultScriptOptions[SCRIPT_OPTIONS_VIEWPORT_ADJUST] = {}
    defaultScriptOptions[SCRIPT_OPTION_WAIT_EVENT] = 'load';
    defaultScriptOptions[SCRIPT_OPTION_WAIT_NETWORK_MILLISECONDS] = 30000;

    // Get script options
    const scriptOptions = files.readOptions(files.getExisting(
      files.SCRIPT_OPTIONS_FILE_NAME, [ scriptDirectory, inputDirectory ]),
      defaultScriptOptions, requiredScriptOptions);
    log.info({options: scriptOptions}, "script.options");
    fs.writeJsonSync( // store options for provenance
      path.join(outputDirectory, files.SCRIPT_OPTIONS_FILE_NAME), scriptOptions);
    const url = scriptOptions[SCRIPT_OPTION_URL];
    const optionsViewportAdjust = scriptOptions[SCRIPT_OPTIONS_VIEWPORT_ADJUST];
    const optionsSnapshot = Object.assign(
      { path: path.join(outputDirectory, "snapshot") },
      scriptOptions[SCRIPT_OPTIONS_SNAPSHOT]);
    const waitEvent = scriptOptions[SCRIPT_OPTION_WAIT_EVENT];
    const waitNetworkMilliseconds =
      scriptOptions[SCRIPT_OPTION_WAIT_NETWORK_MILLISECONDS];

    const page = await browserContext.newPage();
    page.setDefaultTimeout(0); // disable timeouts

    // Load page
    log.info({
        url: url,
        waitEvent: waitEvent,
        waitNetworkMilliseconds: waitNetworkMilliseconds
      }, "script.pageLoad");
    await page.goto(url, {waitUntil: waitEvent});
    log.info("script.pageLoaded");
    await pages.waitForNetworkIdleMax(page, waitNetworkMilliseconds);

    // Adjust viewport height to scroll height
    log.info({optionsViewportAdjust: optionsViewportAdjust}, "script.pageAdjust");
    await pages.adjustViewportToPage(page, optionsViewportAdjust);
    await page.waitForTimeout(1000);
    log.info("script.pageAdjusted");
    await pages.waitForNetworkIdleMax(page, waitNetworkMilliseconds);

    // Take snapshot
    await pages.takeSnapshot(page, optionsSnapshot);
    log.info("script.done");
    return true;
  }
};

