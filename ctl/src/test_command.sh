# shellcheck shell=bash

set -eo pipefail

ctl setup --lazy
npm run test

set +eo pipefail
