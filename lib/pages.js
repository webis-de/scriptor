const fs = require("fs-extra");
const path = require("path");

const log = require("./log");

////////////////////////////////////////////////////////////////////////////////
// CONSTANTS
////////////////////////////////////////////////////////////////////////////////

/**
 * Contains the file names used by {@link takeSnapshot} for the respective
 * snapshot output files.
 * @property {string} dom - for {@link #pagestakedomsnapshot|takeDomSnapshot}
 * @property {string} nodes - for {@link #pagestakenodessnapshot|takeNodesSnapshot}
 * @property {string} screenshot - for {@link #pagestakescreenshot|takeScreenshot}
 * @property {string} viewport - for {@link #pagestakeviewportsnapshot|takeViewportSnapshot}
 * @type {Object}
 * @readonly
 * @memberof pages 
 */
const SNAPSHOT_DEFAULT_FILE_NAMES = Object.freeze({
  dom: "dom.html",
  nodes: "nodes.jsonl",
  screenshot: "screenshot.png",
  viewport: "viewport.json"
});
module.exports.SNAPSHOT_DEFAULT_FILE_NAMES = SNAPSHOT_DEFAULT_FILE_NAMES;

/**
 * Contains the default options for each snapshot function.
 * @property {Object} dom - for {@link #pagestakedomsnapshot|takeDomSnapshot}
 * @property {Object} nodes - for {@link #pagestakenodessnapshot|takeNodesSnapshot}
 * @property {Object} screenshot - for {@link #pagestakescreenshot|takeScreenshot}
 * @property {Object} viewport - for {@link #pagestakeviewportsnapshot|takeViewportSnapshot}
 * @type {Object}
 * @readonly
 * @memberof pages 
 */
const SNAPSHOT_DEFAULT_OPTIONS = Object.freeze({
  dom: Object.freeze({}),
  nodes: Object.freeze({
    addAttributes: true,
    addCss: true,
    addElementText: true,
    includeInvisible: true
  }),
  screenshot: Object.freeze({
    fullPage: true
  }),
  viewport: Object.freeze({})
});
module.exports.SNAPSHOT_DEFAULT_OPTIONS = SNAPSHOT_DEFAULT_OPTIONS;

/**
 * Default options for {@link #pagesadjustviewporttopage|adjustViewportToPage}.
 * @type {Object}
 * @readonly
 * @memberof pages 
 */
const VIEWPORT_ADJUST_DEFAULT_OPTIONS = Object.freeze({
  widthEnlarge: false,
  widthReduce: false,
  widthMinimum: 360,
  widthMaximum: Number.MAX_SAFE_INTEGER,
  heightEnlarge: true,
  heightReduce: false,
  heightMinimum: 360,
  heightMaximum: Number.MAX_SAFE_INTEGER
});
module.exports.VIEWPORT_ADJUST_DEFAULT_OPTIONS = VIEWPORT_ADJUST_DEFAULT_OPTIONS;

////////////////////////////////////////////////////////////////////////////////
// VIEWPORT
////////////////////////////////////////////////////////////////////////////////

/**
 * Gets the current browser viewport as a rectangle in page coordinates.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @returns {Object} - The browser viewport extent with the following integer
 * number properties, each specifying a distance in pixels:
 * ```
 * x: from left page border to left viewport border
 * y: from top page border to top viewport border
 * width: from left to right viewport border
 * height: from top to bottom viewport border
 * ```
 * @memberof pages 
 */
const getViewport = async function(page) {
  return page.evaluate(() => {
    const viewport = {
      x: window.pageXOffset,
      y: window.pageYOffset,
      width: window.innerWidth,
      height: window.innerHeight
    };
    return viewport;
  });
}
module.exports.getViewport = getViewport;

/**
 * Adjusts the viewports to the current web page according to the options.
 *
 * By default options, the viewport may only be enlarged.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @param {Object} options - Limits the adjustment, overwriting
 * {@link #pagesviewport_adjust_default_options|VIEWPORT_ADJUST_DEFAULT_OPTIONS},
 * or `false` to not adjust at all.
 * @param {boolean} [options.widthEnlarge = false] - Whether to enlarge the
 * viewport width if the page is larger than the viewport
 * @param {boolean} [options.widthReduce = false] - Whether to reduce the
 * viewport width if the page is smaller than the viewport
 * @param {number} [options.widthMinimum = 360] - The minimum integer number of
 * pixels to reduce the viewport width to (only considered when reducing the
 * viewport width)
 * @param {number} [options.widthMaximum = Number.MAX_SAFE_INTEGER] - The
 * maximum integer number of pixels to enlarge the viewport width to (only
 * considered when enlarging the viewport width)
 * @param {boolean} [options.heightEnlarge = true] - Whether to enlarge the
 * viewport height if the page is larger than the viewport
 * @param {boolean} [options.heightReduce = false] - Whether to reduce the
 * viewport height if the page is smaller than the viewport
 * @param {number} [options.heightMinimum = 360] - The minimum integer number of
 * pixels to reduce the viewport height to (only considered when reducing the
 * viewport height)
 * @param {number} [options.heightMaximum = Number.MAX_SAFE_INTEGER] - The
 * maximum integer number of pixels to enlarge the viewport height to (only
 * considered when enlarging the viewport height)
 * @returns {boolean} - Whether the viewport was changed
 * @memberof pages 
 */
const adjustViewportToPage = async function(page, options = {}) {
  if (options === false) { return Promise.resolve(null); } // do not execute

  const opts = Object.assign({}, VIEWPORT_ADJUST_DEFAULT_OPTIONS, options);
  const oldViewportSize = await page.viewportSize();
  const pageHeight = await getHeight(page);
  const pageWidth = await getWidth(page);

  const viewportSize = Object.assign({}, oldViewportSize);
  if (pageWidth < viewportSize.width) {
    if (opts.widthReduce) { viewportSize.width = Math.max(opts.widthMinimum, pageWidth); }
  } else {
    if (opts.widthEnlarge) { viewportSize.width = Math.min(opts.widthMaximum, pageWidth); }
  }
  if (pageHeight < viewportSize.height) {
    if (opts.heightReduce) { viewportSize.height = Math.max(opts.heightMinimum, pageHeight); }
  } else {
    if (opts.heightEnlarge) { viewportSize.height = Math.min(opts.heightMaximum, pageHeight); }
  }

  if (viewportSize.height !== oldViewportSize.height
      || viewportSize.width !== oldViewportSize.width) {
    log.info({old: oldViewportSize, new: viewportSize}, "pages.adjustViewportToPage");
    return page.setViewportSize(viewportSize)
      .then(() => true);
  } else {
    return Promise.resolve(false);
  }
}
module.exports.adjustViewportToPage = adjustViewportToPage;

/**
 * Checks whether the viewport is at the bottom of the page.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @returns {boolean} - Whether the viewport is at the bottom of the page
 * @memberof pages 
 */
const isScrolledToBottom = async function(page) {
  return page.evaluate(() => (window.pageYOffset + window.innerHeight) >= document.body.scrollHeight);
}
module.exports.isScrolledToBottom = isScrolledToBottom;

////////////////////////////////////////////////////////////////////////////////
// PAGE
////////////////////////////////////////////////////////////////////////////////

/**
 * Gets the height of the page's body element in pixels, including content not
 * visible on the screen due to overflow.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @returns {number} - The height in pixels
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight
 * @memberof pages 
 */
const getHeight = async function(page) {
  return page.evaluate(() => document.body.scrollHeight);
}
module.exports.getHeight = getHeight;

/**
 * Gets the width of the page's body element in pixels, including content not
 * visible on the screen due to overflow.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @returns {number} - The width in pixels
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollWidth
 * @memberof pages 
 */
const getWidth = async function(page) {
  return page.evaluate(() => document.body.scrollWidth);
}
module.exports.getWidth = getWidth;

////////////////////////////////////////////////////////////////////////////////
// SNAPSHOTS
////////////////////////////////////////////////////////////////////////////////

/**
 * Takes a snapshot of the screen and viewport coordinates, the DOM (structure),
 * and information on each DOM node.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @param {object} options - An object with an optional property
 * `path` that specifies the directory to store the snapshot in (will
 * be created if it does not exist) and options for each snapshot kind as
 * objects within this object:
 * <ul>
 * <li>Property `dom` for {@link takeDomSnapshot}</li>
 * <li>Property `nodes` for {@link takeNodesSnapshot}</li>
 * <li>Property `screenshot` for {@link takeScreenshot}</li>
 * <li>Property `viewport` for {@link takeViewportSnapshot}</li>
 * </ul>
 * These snapshot-specific options can overwrite a generic `path` and
 * can be `false` (instead of an object) to disable the respective
 * snapshot
 * @returns {object} - With a property per snapshot the corresponds to the value
 * returned by the respective snapshot function
 * @memberof pages 
 */
const takeSnapshot = async function(page, options = {}) {
  if (options === false) { return Promise.resolve(null); } // do not execute

  // Set path if set on options
  if (options.path !== undefined) {
    fs.mkdirSync(options.path, { recursive: true });
    for (kind in SNAPSHOT_DEFAULT_FILE_NAMES) {
      options[kind] = Object.assign({}, options[kind]); // ensure object
      if (options[kind].path === undefined) {
        options[kind].path =
          path.join(options.path, SNAPSHOT_DEFAULT_FILE_NAMES[kind]);
      }
    }
  }

  // start all snapshots asynchronously
  const domSnapshot = takeDomSnapshot(page, options.dom);
  const nodesSnapshot = takeNodesSnapshot(page, options.nodes);
  const screenshot = takeScreenshot(page, options.screenshot);
  const viewportSnapshot = takeViewportSnapshot(page, options.viewport);

  // await snapshots
  const results = {
    dom: await domSnapshot,
    nodes: await nodesSnapshot,
    screenshot : await screenshot,
    viewport: await viewportSnapshot
  };
  return results;
}
module.exports.takeSnapshot = takeSnapshot;

/**
 * Takes a snapshot of the HTML DOM.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @param {object} options - Options for taking the snapshot (or
 * `false` to take none):
 * <ul>
 * <li>Property `path` (string): (HTML)-file to write the snapshot to
 * (if specified)</li>
 * </ul>
 * @returns {string} - The HTML DOM
 * @memberof pages 
 */
const takeDomSnapshot = async function(page, options = {}) {
  if (options === false) { return Promise.resolve(null); } // do not execute
  const opts = Object.assign({}, SNAPSHOT_DEFAULT_OPTIONS.dom, options);

  const domSnapshot = await page.content();
  if (opts.path !== undefined) {
    fs.writeFileSync(opts.path, await domSnapshot);
  }
  return domSnapshot;
}
module.exports.takeDomSnapshot = takeDomSnapshot;

/**
 * Takes a snapshot of all DOM nodes.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @param {object} options - Options for taking the snapshot (or
 * `false` to take none):
 * <ul>
 * <li>Property `path` (string): (JSONL)-file to write the snapshot
 * to (if specified)</li>
 * <li>Property `addCss` (boolean): Whether to add all CSS properties
 * to each node (default: `true`)</li>
 * <li>Property `includeInvisible` (boolean): Whether to include
 * invisible nodes in the snapshot (default: `true`)</li>
 * </ul>
 * @returns {string} - The nodes in JSONL format with these properties:
 * <ul>
 * <li>Property `xPath` (string): An XPath of the node</li>
 * <li>Property `visible` (boolean): Whether the node is currently
 * <a href="https://stackoverflow.com/a/33456469">visible</a></li>
 * <li>Property `id` (string): Value of the node's id attribute or
 * `undefined` if the attribute is not set</li>
 * <li>Property `classes` (array<string>): All entries of the node's
 * class attribute (if applicable)</li>
 * <li>Property `position` (object): The node's position on the page
 * in pixels with properties `x`, `y`, `width`,
 * and `height`</li>
 * <li>Property `text` (string): The node's inner text (can be
 * disabled for elements (not text nodes) with
 * `options.addElementText = false`)</li>
 * <li>Property `attributes` (object): An object with the attributes
 * of the node (can be disabled with
 * `options.addAttributes = false`)</li>
 * <li>Property `css` (object): An object that maps CSS attributes to
 * the node's value for the attribute (can be disabled with
 * `options.addCss = false`)</li>
 * </ul>
 * @memberof pages 
 */
const takeNodesSnapshot = async function(page, options = {}) {
  if (options === false) { return Promise.resolve(null); } // do not execute
  const opts = Object.assign({}, SNAPSHOT_DEFAULT_OPTIONS.nodes, options);

  const nodesSnapshot = await page.evaluate((opts) => {
    const nodes = [];

    const getNodeAttributes = (element) => {
      return Object.fromEntries(
        Array.from(element.attributes)
          .map(row => {return [row.name,row.value]}));
    };

    const getNodeCss = (element) => {
      const styles = window.getComputedStyle(element);
      const cssArray = Array.from(styles).map(name => [name, styles.getPropertyValue(name)]);
      const css = {};
      cssArray.forEach((data) => { css[data[0]] = data[1] });
      return css;
    };

    const isVisible = (element) => {
      // https://stackoverflow.com/a/33456469
      return !!( element.offsetWidth || element.offsetHeight || element.getClientRects().length );
    }

    const traverse = (node, parentPath, nodeName, nodeNameNumber) => {
      const nodePath = parentPath + "/" + nodeName + "[" + nodeNameNumber + "]";
      const nodeId = node.id ? node.id : undefined;
      let nodeVisible, nodeClasses, nodeBox, nodeText, nodeAttributes, nodeCss;
      if (node.nodeType === Node.ELEMENT_NODE) {
        nodeVisible = isVisible(node);
        if (!nodeVisible && !opts.includeInvisible) { return; }
        nodeClasses = Array.from(node.classList);
        nodeBox = node.getBoundingClientRect();
        if (opts.addElementText) {
          nodeText = node.innerText;
          if (nodeText) { nodeText = nodeText.trim().replace(/\n/g, "\\n"); }
          if (nodeText === "") { nodeText = undefined; }
        }
        if (opts.addAttributes) { nodeAttributes = getNodeAttributes(node); }
        if (opts.addCss) { nodeCss = getNodeCss(node); }
      } else {
        nodeVisible = isVisible(node.parentElement);
        if (!nodeVisible && !opts.includeInvisible) { return; }
        const nodeRange = document.createRange();
        nodeRange.selectNode(node);
        nodeBox = nodeRange.getBoundingClientRect();
        nodeText = node.textContent.trim().replace(/\n/g, "\\n");
        if (nodeText === "") { return }
      }
      const xmin = nodeBox.left;
      const ymin = nodeBox.top;
      const width = nodeBox.width;
      const height = nodeBox.height;
      nodes.push(JSON.stringify({
        xPath: nodePath,
        visible: nodeVisible,
        id: nodeId,
        classes: nodeClasses,
        position: {x: xmin, y: ymin, width: width, height: height},
        text: nodeText,
        attributes: nodeAttributes,
        css: nodeCss
      }));

      if (node.nodeType === Node.ELEMENT_NODE) {
        const counts = {};
        const children = node.childNodes;
        
        for (let c = 0; c < children.length; ++c) {
          const child = children[c];
          if (child.nodeType === Node.ELEMENT_NODE
              || child.nodeType === Node.TEXT_NODE) {
            const childName = child.nodeType === Node.TEXT_NODE
              ? "text()"
              : child.tagName;

            if (typeof counts[childName] === "undefined") {
              counts[childName] = 1;
            } else {
              counts[childName] += 1;
            }
            traverse(child, nodePath, childName, counts[childName]);
          }
        }
      }
    };

    traverse(document.getElementsByTagName("body")[0], "/HTML[1]", "BODY", 1)
    return nodes.join("\n");
  }, opts);

  if (opts.path !== undefined) {
    fs.writeFileSync(opts.path, await nodesSnapshot);
  }
  return nodesSnapshot;
}
module.exports.takeNodesSnapshot = takeNodesSnapshot;

/**
 * Takes a screenshot of the page.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @param {object} options - Options for taking the screenshot (or
 * `false` to take none), which are passed to the respective
 * <a href="https://playwright.dev/docs/api/class-page#page-screenshot">Playwright
 * function</a>
 * @returns {string} - The screenshot as buffered image
 * @memberof pages 
 */
const takeScreenshot = async function(page, options = {}) {
  if (options === false) { return Promise.resolve(null); } // do not execute
  const opts = Object.assign({}, SNAPSHOT_DEFAULT_OPTIONS.screenshot, options);

  return page.screenshot(options);
}
module.exports.takeScreenshot = takeScreenshot;

/**
 * Takes a snapshot of the viewport position.
 * @param {Page} page - A Playwright
 * {@link https://playwright.dev/docs/api/class-page|Page} object
 * @param {object} options - Options for taking the snapshot (or
 * `false` to take none):
 * <ul>
 * <li>Property `path` (string): (JSON)-file to write the snapshot to
 * (if specified)</li>
 * </ul>
 * @returns {object} - The snapshot with following properties:
 * <ul>
 * <li>Property `x`: Distance from left page border to left viewport
 * border in pixels</li>
 * <li>Property `y`: Distance from top page border to top viewport
 * border in pixels</li>
 * <li>Property `width`: Width of the viewport in pixels</li>
 * <li>Property `height`: Height of the viewport in pixels</li>
 * </ul>
 * @see getViewport
 * @memberof pages 
 */
const takeViewportSnapshot = async function(page, options = {}) {
  if (options === false) { return Promise.resolve(null); } // do not execute
  const opts = Object.assign({}, SNAPSHOT_DEFAULT_OPTIONS.viewport, options);

  const viewportSnapshot = getViewport(page);
  if (opts.path !== undefined) {
    fs.writeFile(opts.path, JSON.stringify(await viewportSnapshot));
  }
  return viewportSnapshot;
}
module.exports.takeViewportSnapshot = takeViewportSnapshot;

