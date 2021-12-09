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
git tag vX.X.X
git push origin vX.X.X
```
Will automatically publish to npm and ghcr.

