# shellcheck shell=bash

set -eo pipefail

set +o nounset
lazy="${args[--lazy]}"
set -o nounset

root=$(git rev-parse --show-toplevel)
if [ ! "$lazy" ] || [ ! -d "${root}/node_modules" ]; then
  echo "running npm install"
  npm install
fi

set +eo pipefail
