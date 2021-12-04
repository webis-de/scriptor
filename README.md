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
  --script-directory scripts/ScrollDown \
  --input-directory doc/example/scrollDownInput \
  --output-directory output

# run with configuration from standard input
cat doc/example/scrollDownInput/config.json \
  | scriptor \
      --script-directory scripts/ScrollDown \
      --input-directory - \
      --output-directory output
```

## CI
Update version (X.X.X) in `package.json`.
```
git tag vX.X.X
git push origin vX.X.X
```
Will automatically publish to npm and ghcr.
