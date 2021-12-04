const fs = require("fs-extra");
const path = require('path');

const seal = require('seal-simulator');

const NAME = "ScrollDown";
const VERSION = "0.1.0";

const SCRIPT_OPTION_URL = "url";
const SCRIPT_OPTION_MIN_SCREENSHOT_HEIGHT = "minHeigth";
const SCRIPT_OPTION_MIN_SCREENSHOT_HEIGHT_DEFAULT = 663;
const SCRIPT_OPTION_NODES_SNAPSHOT_OPTIONS = "nodesSnapshot";
const SCRIPT_OPTION_NODES_SNAPSHOT_OPTIONS_DEFAULT = {};


exports.SealScript = class extends seal.AbstractSealScript {

  constructor(scriptDirectory, inputDirectory) {
    super(NAME, VERSION, scriptDirectory, inputDirectory);
    this.setConfigurationRequired(SCRIPT_OPTION_URL);
    this.setConfigurationDefault(
      SCRIPT_OPTION_MIN_SCREENSHOT_HEIGHT,
      SCRIPT_OPTION_MIN_SCREENSHOT_HEIGHT_DEFAULT);
    this.setConfigurationDefault(
      SCRIPT_OPTION_NODES_SNAPSHOT_OPTIONS,
      SCRIPT_OPTION_NODES_SNAPSHOT_OPTIONS_DEFAULT);
  }

  async run(browserContexts, outputDirectory) {
    // Initialization
    const browserContext =
      browserContexts[seal.constants.BROWSER_CONTEXT_DEFAULT];
    const url = this.getConfiguration(SCRIPT_OPTION_URL);
    const minScreenshotHeight =
      this.getConfiguration(SCRIPT_OPTION_MIN_SCREENSHOT_HEIGHT);
    const nodesSnapshotOptions =
      this.getConfiguration(SCRIPT_OPTION_NODES_SNAPSHOT_OPTIONS);

    // Load page
    const page = await browserContext.newPage();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Adapt viewport height to scroll height
    const viewportSize = page.viewportSize();
    viewportSize.height =
      Math.max(await seal.pages.getScrollHeight(page), minScreenshotHeight);
    await page.setViewportSize(viewportSize); 
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Take snapshots
    await Promise.all([
      page.screenshot({
        path: path.join(outputDirectory, "screenshot.png"),
        fullPage: true 
      }),
      seal.pages.writeNodesSnapshot(
        page, path.join(outputDirectory, "nodes.jsonl"), nodesSnapshotOptions),
      seal.pages.writeDomSnapshot(
        page, path.join(outputDirectory, "dom.html"))
    ]);

    // Simulation is not continued
    const simulationComplete = true;
    return simulationComplete;
  }
};

