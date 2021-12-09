Webis Scriptor
==============
Web user simulation and archiving framework.

[[code](https://github.com/webis-de/scriptor)]
[[node](https://www.npmjs.com/package/webis-de/scriptor)]
[[docker](https://github.com/webis-de/scriptor/pkgs/container/scriptor)]


Installation
------------
Make sure you have both [Docker](https://docs.docker.com/get-docker/) and a recent [NodeJS](https://nodejs.dev/learn/how-to-install-nodejs) installation. If you do not want to install NodeJS, you can still [run the Docker container directly](#run-without-nodejs).
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
```
# on unix, use sudo if you are not in the "docker" group
scriptor \
  --input doc/example/snapshot-input/ \
  --output-directory output
```


Run without NodeJS
------------------
At the cost of reduced convenience, you can run scriptor with only a [Docker](https://docs.docker.com/get-docker/) installation:
```
docker run -it --rm \
  --volume <script-directory>:/script:ro \
  --volume <input-directory>:/input:ro \
  --volume <output-directory>:/output \
  ghcr.io/webis-de/scriptor:latest <parameters>
```
- `<script/input/output-directory>` are the absolute paths to the respective directories
  - The `<script-directory>` line can be omitted to run the [Snapshot script](scripts/Snapshot/Script.js)
  - The `<input-directory>` line can be omitted depending on the script or when the config is set by `--input '{...}'`
- `<parameters>` are additional parameters

Get the help (but ignore `--script-directory` and `--output-directory`):
```
docker run -it --rm ghcr.io/webis-de/scriptor:latest --help
```

