#!/bin/bash

main_dir="$(dirname $0)/.."
pushd $main_dir > /dev/zero

branch="$(git branch --show-current)"
if [ "$branch" != "development" ];then
  echo "You are not on the development branch!"
  echo "Publishing is only possible from development"
  exit 1
fi

version="$(cat package.json | jq -r '.version')"
echo "Detected version from package.json: $version"

if [ $(git tag | grep "^v$version$" | wc -l) -ne 0 ];then
  echo "A tag v$version already exists... aborting"
  exit 1
fi

localPlaywright="$(cat package.json | jq '.devDependencies.playwright')"
latestPlaywright="$(npm view playwright dist-tags.latest --json)"
if [ "$localPlaywright" == "$latestPlaywright" ];then
  echo "Playwright is up to date: $localPlaywright"
else
  echo "Playwright should be updated to: $latestPlaywright"
  exit 1
fi

echo "Building documentation"
documentation build -f html -o docs/api --github --config docs/api/config.yml

echo "Updating package lock"
npm i --package-lock-only

echo "Merging into main branch"
git checkout main
git merge development

echo "Committing"
git add -A
git commit -m "version $version"
git push
git tag "v$version"
git push origin "v$version"

echo "Creating development branch for new version"
git checkout -b development

