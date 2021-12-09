Webis Scriptor Development
==========================

Local building
--------------
```
docker build -t ghcr.io/webis-de/scriptor:latest .
```

Continuous Integration
----------------------
Update version (X.X.X) in `package.json`.
```
git tag vX.X.X
git push origin vX.X.X
```
Will automatically publish to npm and ghcr.

