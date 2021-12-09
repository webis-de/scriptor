#!/bin/bash

base_command="$(dirname $0)/scriptor-run.js --script-directory /script --output-directory /output $@"

if [ -e /input ];then
  # input directory
  eval ${base_command} --input /input
else
  # no input directory
  eval ${base_command}
fi

