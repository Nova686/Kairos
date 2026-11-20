#!/bin/sh
set -eu

. "$(dirname "$0")/configure-offsite-remote.sh"

exec rclone "$@"
