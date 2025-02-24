# shellcheck shell=bash

set -eo pipefail

ctl setup --lazy
npm run build

set +eo pipefail
