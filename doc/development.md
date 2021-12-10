Webis Scriptor Development
==========================

Local Development
-----------------
```
docker build -t ghcr.io/webis-de/scriptor:dev .
```
Then use `-d dev` when running `scriptor`.


Update Playwright
-----------------
Update in [package.json](https://github.com/webis-de/scriptor/blob/main/package.json) and the [Dockerfile](https://github.com/webis-de/scriptor/blob/main/Dockerfile#L1).


Continuous Integration
----------------------
Update version in [package.json](https://github.com/webis-de/scriptor/blob/main/package.json).
```
./bin/publish.sh
```
