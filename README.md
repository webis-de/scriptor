# Webis Scriptor
Web user simulation and archiving framework.

[[code](https://github.com/webis-de/scriptor)]
[[node](https://www.npmjs.com/package/webis-de/scriptor)]
[[docker](https://github.com/webis-de/scriptor/pkgs/container/scriptor)]

## Quickstart 
Global installation
```
npm install -g # may require sudo

# adjust for your system, might already be set
export NODE_PATH=/usr/local/lib/node_modules/

# run with configuration in input directory
scriptor \
  --script-directory scripts/Snapshot \
  --input-directory doc/example/snapshot-input/ \
  --output-directory output

# run with configuration from standard input
cat doc/example/snapshot-input/config.json \
  | scriptor \
      --script-directory scripts/Snapshot \
      --input-directory - \
      --output-directory output

# run with docker TODO
sudo docker build -t scriptor .
rm -rf output && mkdir output && sudo docker run --user $(id -u):$(id -g) -it --rm -v $PWD/output:/output -v $PWD/doc/example/snapshot-input:/input:ro -v $PWD/scripts/Snapshot:/script:ro scriptor --video 0.5
```

## CI
Update version (X.X.X) in `package.json`.
```
git tag vX.X.X
git push origin vX.X.X
```
Will automatically publish to npm and ghcr.
