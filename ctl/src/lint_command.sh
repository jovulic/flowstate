# shellcheck shell=bash

set -eo pipefail

ctl setup --lazy
npm run lint

set +eo pipefail
