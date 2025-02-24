# shellcheck shell=bash

set -eo pipefail

ctl setup --lazy
npm run format

set +eo pipefail
