# shellcheck shell=bash

root=$(git rev-parse --show-toplevel)
(cd "$root/ctl" && bashly generate)
direnv reload
