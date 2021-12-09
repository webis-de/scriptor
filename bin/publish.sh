#!/bin/bash

main_dir="$(dirname $0)/.."
pushd $main_dir > /dev/zero

version="$(cat package.json | jq -r '.version')"
echo "Detected version from package.json: $version"

if [ $(git tag | grep "^v$version$" | wc -l) -ne 0 ];then
  echo "A tag v$version already exists... aborting"
  exit 1
fi

npm i --package-lock-only
git add -A
git commit -m "version $version"
git tag "v$version"
git push origin "v$version"

