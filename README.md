Webis Scriptor
==============
Plug-and-play reproducible web analysis.

[![latest version](https://img.shields.io/github/v/tag/webis-de/scriptor?label=latest&sort=semver)](https://github.com/webis-de/scriptor)
[![npm workflow](https://img.shields.io/github/workflow/status/webis-de/scriptor/Publish%20to%20NPM?label=nodejs)](https://www.npmjs.com/package/@webis-de/scriptor)
[![docker workflow](https://img.shields.io/github/workflow/status/webis-de/scriptor/Publish%20to%20GitHub%20Packages?label=docker)](https://github.com/webis-de/scriptor/pkgs/container/scriptor)
[![license](https://img.shields.io/github/license/webis-de/scriptor)](https://github.com/webis-de/scriptor/blob/main/LICENSE)
[![playwright version](https://img.shields.io/github/package-json/dependency-version/webis-de/scriptor/dev/playwright)](https://playwright.dev/)

Scriptor runs [your web analyses](#developing-own-scripts) on rendered web pages in an up-to-date browser. It owes much of its power to the [Playwright](https://playwright.dev/) browser automation library, but integrates [pywb](https://github.com/webrecorder/pywb)'s [archiving](#output-directory-structure) and [replay](#running-on-archives-replay) capabilities for provenance and reproducibility. Use cases are as diverse as high-fidelity web archiving, content extraction, and web user simulation.



Installation
------------
Make sure you have both [Docker](https://docs.docker.com/get-docker/) and a recent [NodeJS](https://nodejs.dev/learn/how-to-install-nodejs) installation. If you do not want to install NodeJS, you can also [run the Docker container directly](#running-without-nodejs).
```
# install packages to run './bin/scriptor.js':
npm install --only=production

# install into system path to run 'scriptor', may require sudo or similar:
npm install --global
# if scriptor can not be found, set the node path (adjust to your system):
export NODE_PATH=/usr/local/lib/node_modules/
```



Quickstart
----------
To run `scriptor` you need the permission to execute `docker run`.

Take a snapshot:
```
scriptor --input "{\"url\":\"https://github.com/webis-de/scriptor\"}" --output-directory output1
```

Use an [input directory](https://github.com/webis-de/scriptor/tree/main/docs/example/snapshot-input) for more configuration options (e.g., configure the [browser](https://github.com/webis-de/scriptor/blob/main/docs/example/snapshot-input/browserContexts/default/browser.json) with [all options of Playwright](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context)):
```
scriptor --input docs/example/snapshot-input/ --output-directory output2
```

Replace the [default script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js) with an own one (see [Developing Own Scripts](#developing-own-scripts)):
```
scriptor --script-directory path/to/my/own/script --output-directory output3
```

Have a look at available features:
```
scriptor --help
```



Output Directory Structure
--------------------------
```
output/
├─ browserContexts/
|  └─ default/     # Shares the name of the browser context
|     ├─ userData/    # Browser files (cache, cookies, ...)
|     ├─ video/       # Recorded videos if --video is set
|     ├─ warcs/       # Recorded web archive collection
|     ├─ archive.har  # Recorded web archive in HAR format
|     ├─ browser.json # Used browser context options
|     └─ trace.zip    # Playwright trace
└─ logs/
   └─ scriptor.log    # Container log
```
Scripts usually place additional data into the `output` directory. For example, the [default script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js) adds a [snapshot](#snapshots).

The `warcs` directory is created using [pywb](https://github.com/webrecorder/pywb) and thus follows its [directory structure](https://pywb.readthedocs.io/en/latest/manual/configuring.html#directory-structure). Note that efforts exist to [standardize this structure](https://github.com/webrecorder/wacz-spec): and they are looking for feedback!

To view the `trace.zip`, see [the Playwright docs](https://playwright.dev/docs/trace-viewer#viewing-the-trace) or just directly load it into the [progressive web app](https://trace.playwright.dev/).

Scriptor uses [Bunyan](https://github.com/trentm/node-bunyan) for logging. The [Bunyan CLI](https://github.com/trentm/node-bunyan#cli-usage) allows to filter and pretty-print the logs.



Developing Own Scripts
----------------------
Create a `Script.js` and extend [AbstractScriptorScript](https://github.com/webis-de/scriptor/blob/main/lib/AbstractScriptorScript.js):
```
const { AbstractScriptorScript, files, pages } = require('@webis-de/scriptor');

module.exports = class extends AbstractScriptorScript {

  constructor() { super("MyScript", "0.1.0"); } // log script name and version
  
  async run(browserContexts, scriptDirectory, inputDirectory, outputDirectory) { }

}
```
The directory that contains your `Script.js` is called the "script directory": use the `--script-directory` option to specify it on the command line and your script's `run` method will be used instead of the one of the [default script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js). The script and input directory are read-only. Everything the script produces should be written to the [output directory](#output-directory-structure).

**Controlling the Browser(s)**
Each of the `browserContexts` is a Playwright [BrowserContext](https://playwright.dev/docs/api/class-browsercontext) object, roughly corresponding to a browser session. Your script can use the BrowserContext's [newPage](https://playwright.dev/docs/api/class-browsercontext#browser-context-new-page) method to create a new [Page](https://playwright.dev/docs/api/class-page) (like a browser tab)—the object to open, read, and manipulate web pages. [pages.js](#pagesjs) adds even more methods to this end.

If the script uses a single browser (the usual case), the `run` method should start with
```
const browserContext = browserContexts["default"];
```
which gets a browser context [configured](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context) using the `browserContexts/default/browser.json` files in the script and input directory (specified by `--input`) if they exist. The following configuration precedence applies (lowest to highest): defaults < script directory browser.json < input directory browser.json < scriptor command line options (e.g., `--show-browser`). In addition to [Playwright's options](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context), the `browserType` option allows to specify which browser to use: "chromium" (default), "firefox", or "webkit".

Place directories inside `browserContexts` to receive correspondingly named browser contexts in `run`'s `browserContexts` parameter. An [output directory](#output-directory-structure) is created for each browser context.

**Configuring the Script**
Most scripts have parameters, which should be specified in a `config.json` in the input directory—or by other options of `--input`. A `config.json` in the script directory can be used to specify defaults, though these could also be specified in the script's code. The recommended way for reading the JSON files is:
```
const defaultScriptOptions = { ... };
const requiredScriptOptions = [ ... ];
const scriptOptions = files.readOptions(files.getExisting(
    "config.json", [ scriptDirectory, inputDirectory ]),
  defaultScriptOptions, requiredScriptOptions);
```


### Scriptor API
Scriptor provides several static functions to assist you with manipulating Playwright [pages](https://playwright.dev/docs/api/class-page) or when dealing with the Scriptor directory structure. See the [API documentation](https://webis.de/scriptor/api/)


### Chaining
Scriptor is designed to simplify the creation of "checkpoints", from which Scriptor could continue after a crash, or just to serve as an intermediate archive of what has been seen so far. By default, Scriptor stores the browser state (for each browser context) in the output directory so that it is loaded automatically when that output directory is used as the input directory for a new run. As a developer, you just have to take care that you store (updated, if necessary) all the input files for your script at the same location in the output directory.

If a script allows such "chaining" of runs, its [run](https://webis.de/scriptor/api/#abstractscriptorscriptrun)-method should return `true`, like the [default script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js). Note that a script may return `true` in some cases and `false` in others.

The Scriptor program allows then to automate such chaining by the `--chain [config]` option. Importantly, this will cause the usual output directory structure to be created *within* the provided output directory. The `start`-parameter can then be used to continue from a previous run/chain in the same output directory. Specifically, the `config` is a JSON object with these properties (all optional):
- pattern: name of the output directoy within `--output-directory` for each run, with "%0Xd" replaced by the X-digit run number (with leading zeroes; default: "run%06d")
- start: number of the first run (default: 1)
- max: maximum number of runs (default: none)


### Manual Browser Interaction
Scriptor allows for manual interactions with the browser, which can be useful to set cookies or similar. Specifically, using the `--show-browser` option allows scripts to use the [page.pause](https://playwright.dev/docs/api/class-page#page-pause)-method, which will pause the script until the user hits the `resume` button in the dialog that pops up. The same dialog also allows to record interactions as Javascript code. For such simple use cases, the [Manual script](https://github.com/webis-de/scriptor/blob/development/scripts/Manual-0.1.0/Script.js) can be used: it contains (in essence) only the call to `pause`.

Since Scriptor runs in a container, it can not directly open the browser window on your machine. Instead, it runs a [VNC server](https://en.wikipedia.org/wiki/Virtual_Network_Computing) inside the container that you can connect to with a VNC client at `localhost:5942` to see the browser window. Depending on your operating system, you might already have a VNC client installed. If not, [VNC Viewer](https://www.realvnc.com/de/connect/download/viewer/) is available for all major operating systems. The config options of `--show-browser` allow to change the width and height of the virtual display, change the port, allow remote access, and set a password. See `--help`.

If you want to run Scriptor on one machine and interact with it from another machine, make sure to read  [how to use x11vnc](https://github.com/LibVNC/x11vnc#how-to-use-x11vnc) (Scriptor uses x11vnc as its VNC server), especially the sections on how to encrypt your traffic. By default, however, the Scriptor docker container is configured to accept only connections from the machine it is started on.


Running on Archives (Replay)
----------------------------
TODO



Running without NodeJS
----------------------
At the cost of reduced convenience (chaining, timeout, nicer interface), you can run scriptor with only a [Docker](https://docs.docker.com/get-docker/) installation:
```
docker run -it --rm \
  --volume <script-directory>:/script:ro \
  --volume <input-directory>:/input:ro \
  --volume <output-directory>:/output \
  ghcr.io/webis-de/scriptor:latest <parameters>
```
- `<script/input/output-directory>` are the absolute paths to the respective directories
  - The `<script-directory>` line can be omitted to run the [Snapshot script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js)
  - The `<input-directory>` line can be omitted to not set `--input` or when the config is set by `--input "{...}"` in the `<parameters>`
- `<parameters>` are additional options; see `docker run -it --rm ghcr.io/webis-de/scriptor:latest --help`

