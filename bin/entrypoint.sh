#!/bin/bash

base_command="$(dirname $0)/scriptor-run.js --script-directory /script --output-directory /output $@"

if [ -e /input ];then
  # input directory
  eval ${base_command} --input-directory /input
elif [ ! -t 0 ];then
  # input directory from stdin
  cat /dev/stdin | eval ${base_command} --input-directory -
else
  # no input directory
  eval ${base_command}
fi

