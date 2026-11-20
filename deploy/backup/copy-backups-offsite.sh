#!/bin/sh
set -eu

backup_directory="${BACKUP_DIRECTORY:-/backups}"
offsite_retained_dump_count="${OFFSITE_RETAINED_DUMP_COUNT:-14}"
fresh_local_dump_days="${OFFSITE_FRESH_LOCAL_DUMP_DAYS:-2}"

. "$(dirname "$0")/configure-offsite-remote.sh"

rclone copy "$backup_directory" "$offsite_destination" --include "kairos-*.dump"

fresh_local_dump="$(find "$backup_directory" -maxdepth 1 -name 'kairos-*.dump' -mtime "-$fresh_local_dump_days" | head -n 1)"
if [ -z "$fresh_local_dump" ]; then
  echo "offsite prune skipped: no local dump younger than $fresh_local_dump_days days in $backup_directory"
else
  expired_dump_list="$(mktemp)"
  trap 'rm -f "$expired_dump_list"' EXIT
  rclone lsf "$offsite_destination" --files-only --include "kairos-*.dump" \
    | sort -r \
    | tail -n "+$((offsite_retained_dump_count + 1))" > "$expired_dump_list"
  if [ -s "$expired_dump_list" ]; then
    rclone delete "$offsite_destination" --files-from "$expired_dump_list"
  fi
fi

echo "offsite copy done: $offsite_destination"
