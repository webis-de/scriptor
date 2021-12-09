Webis Scriptor Development
==========================

Local development
--------------
```
docker build -t ghcr.io/webis-de/scriptor:dev .
```
Then use `-d dev` for `scriptor`


Continuous Integration
----------------------
Update version (X.X.X) in `package.json`.
```
./bin/publish.sh
```
Will automatically publish to [npm](https://www.npmjs.com/package/@webis-de/scriptor) and [ghcr](https://github.com/webis-de/scriptor/pkgs/container/scriptor).

