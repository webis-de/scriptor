Webis Scriptor Development
==========================

Local Development
-----------------
Always use the `development` branch!
```
git checkout development
```

### Docker Image
```
docker build -t ghcr.io/webis-de/scriptor:dev .
```
Then use `-d dev` when running `scriptor`.

### Documentation
```
documentation build -f html -o docs/ --github --config docs/config.yml
```


Update Playwright
-----------------
Update in [package.json](https://github.com/webis-de/scriptor/blob/main/package.json) and the [Dockerfile](https://github.com/webis-de/scriptor/blob/main/Dockerfile#L1).


Continuous Integration
----------------------
- Check if a new Playwright version exists
- Update Scriptor version in [package.json](https://github.com/webis-de/scriptor/blob/main/package.json).
```
./bin/publish.sh
```
