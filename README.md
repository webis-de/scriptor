Webis Scriptor
==============
Web user simulation and archiving framework.

[![latest version](https://img.shields.io/github/v/tag/webis-de/scriptor?label=latest&sort=semver)](https://github.com/webis-de/scriptor)
[![npm workflow](https://img.shields.io/github/workflow/status/webis-de/scriptor/Publish%20to%20NPM?label=nodejs)](https://www.npmjs.com/package/@webis-de/scriptor)
[![docker workflow](https://img.shields.io/github/workflow/status/webis-de/scriptor/Publish%20to%20GitHub%20Packages?label=docker)](https://github.com/webis-de/scriptor/pkgs/container/scriptor)
[![license](https://img.shields.io/github/license/webis-de/scriptor)](https://github.com/webis-de/scriptor/blob/main/LICENSE)
[![playwright version](https://img.shields.io/github/package-json/dependency-version/webis-de/scriptor/dev/playwright)](https://playwright.dev/)



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
Take a snapshot
```
# on unix, use sudo if you are not in the "docker" group
scriptor --input "{\"url\":\"https://github.com/webis-de/scriptor\"}" --output-directory output1
```

Use an [input directory](https://github.com/webis-de/scriptor/tree/main/doc/example/snapshot-input) for more configuration options (e.g., configure the [browser](https://github.com/webis-de/scriptor/blob/main/doc/example/snapshot-input/browserContexts/default/browser.json) with [all options of Playwright](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context))
```
scriptor --input doc/example/snapshot-input/ --output-directory output2
```

Replace the [default script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js) with an own one (see [Developing Own Scripts](#developing-own-scripts)). The 'script' directory must contain a Script.js that exports a class that extends [AbstractScriptorScript](https://github.com/webis-de/scriptor/blob/main/lib/AbstractScriptorScript.js).
```
scriptor --script-directory path/to/my/own/script --output-directory output3
```



Output Directory Structure
--------------------------
```
output/
├─ browserContexts/
|  └─ default/     # Shares the name of the browser context, see Developing Own Scripts
|     ├─ userData/    # Browser files (cache, cookies, ...)
|     ├─ video/       # Recorded videos if --video is set
|     ├─ warcs/       # Recorded web archive collection with WARCs and indexes, see below
|     ├─ archive.har  # Recorded web archive in HAR format
|     ├─ browser.json # Browser context options that have been used
|     └─ trace.zip    # Playwright trace
└─ scriptor.log    # Container log
```
Scripts usually place additional data into the `output` directory. For example, the [default script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js) adds a [snapshot](#snapshots).

The `warcs` directory is created using [pywb](https://github.com/webrecorder/pywb) and thus follows its [directory structure](https://pywb.readthedocs.io/en/latest/manual/configuring.html#directory-structure). Note that efforts exist to [standardize this structure](https://github.com/webrecorder/wacz-spec): and they are looking for feedback!

To view the `trace.zip`, see [the playwright docs](https://playwright.dev/docs/trace-viewer#viewing-the-trace) or just directly load it into the [progressive web app](https://trace.playwright.dev/).

Scriptor uses [Bunyan](https://github.com/trentm/node-bunyan) for logging, which comes with a [tool](https://github.com/trentm/node-bunyan#cli-usage) for filtering and pretty-printing the logs. Once you have it installed (`npm install --global bunyan`), just add `| bunyan` after the scriptor command to pretty-print the logs. Or use it to pretty-print the `scriptor.log`.



Developing Own Scripts
----------------------
TODO


### files.js
TODO


### pages.js
TODO

#### Snapshots
TODO


### Chaining
TODO



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

