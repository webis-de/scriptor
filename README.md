Webis Scriptor
==============
Web user simulation and archiving framework.

[[code](https://github.com/webis-de/scriptor)]
[[node](https://www.npmjs.com/package/@webis-de/scriptor)]
[[docker](https://github.com/webis-de/scriptor/pkgs/container/scriptor)]


Installation
------------
Make sure you have both [Docker](https://docs.docker.com/get-docker/) and a recent [NodeJS](https://nodejs.dev/learn/how-to-install-nodejs) installation. If you do not want to install NodeJS, you can also [run the Docker container directly](#run-without-nodejs).
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
scriptor --input '{"url":"https://github.com/webis-de/scriptor"}' --output-directory output1
```

Use an [input directory](https://github.com/webis-de/scriptor/tree/main/doc/example/snapshot-input) for more configuration options (e.g., of the [browser](https://github.com/webis-de/scriptor/blob/main/doc/example/snapshot-input/browserContexts/default/browser.json))
```
scriptor --input doc/example/snapshot-input/ --output-directory output2
```

Replace the [default script](https://github.com/webis-de/scriptor/blob/main/scripts/Snapshot-0.1.0/Script.js) with an own one. The 'script' directory must contain a Script.js that exports a class that extends [AbstractScriptorScript](https://github.com/webis-de/scriptor/blob/main/lib/AbstractScriptorScript.js).
```
scriptor --script-directory path/to/my/own/script --output-directory output3
```


Log Viewer
----------
Scriptor uses [Bunyan](https://github.com/trentm/node-bunyan) for logging, which comes with a [tool](https://github.com/trentm/node-bunyan#cli-usage) for filtering and pretty-printing the logs. Once you have it installed (`npm install --global bunyan`), just add `| bunyan` after the scriptor command to pretty-print the logs.


Run without NodeJS
------------------
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
  - The `<input-directory>` line can be omitted depending on the script or when the config is set by `--input '{...}'`
- `<parameters>` are additional parameters

Get the help (but ignore `--script-directory` and `--output-directory`):
```
docker run -it --rm ghcr.io/webis-de/scriptor:latest --help
```

