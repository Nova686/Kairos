google_drive_token_file="${KAIROS_DRIVE_TOKEN_FILE:-/drive-credentials/google-drive-token.json}"
missing_offsite_settings=""

require_offsite_setting() {
  if [ -z "$1" ]; then
    missing_offsite_settings="$missing_offsite_settings $2"
  fi
}

refuse_missing_offsite_settings() {
  if [ -n "$missing_offsite_settings" ]; then
    echo "Copie hors machine impossible, à renseigner dans deploy/.env :$missing_offsite_settings" >&2
    exit 1
  fi
}

if [ -n "${KAIROS_DRIVE_CLIENT_ID:-}" ]; then
  require_offsite_setting "${KAIROS_DRIVE_CLIENT_SECRET:-}" KAIROS_DRIVE_CLIENT_SECRET
  refuse_missing_offsite_settings
  if [ ! -s "$google_drive_token_file" ]; then
    echo "Copie vers Google Drive impossible : accès pas encore accordé, lancez docker compose -f deploy/compose.yml run --rm google-drive-authorize" >&2
    exit 1
  fi
  RCLONE_CONFIG_OFFSITE_TOKEN="$(cat "$google_drive_token_file")"
  export RCLONE_CONFIG_OFFSITE_TOKEN
  export RCLONE_CONFIG_OFFSITE_TYPE=drive
  export RCLONE_CONFIG_OFFSITE_CLIENT_ID="$KAIROS_DRIVE_CLIENT_ID"
  export RCLONE_CONFIG_OFFSITE_CLIENT_SECRET="$KAIROS_DRIVE_CLIENT_SECRET"
  export RCLONE_CONFIG_OFFSITE_SCOPE=drive.file
  export RCLONE_CONFIG_OFFSITE_USE_TRASH=false
  offsite_destination="offsite:${KAIROS_DRIVE_FOLDER:-Sauvegardes Kairos}"
else
  require_offsite_setting "${KAIROS_OFFSITE_BUCKET:-}" KAIROS_OFFSITE_BUCKET
  require_offsite_setting "${KAIROS_OFFSITE_ENDPOINT:-}" KAIROS_OFFSITE_ENDPOINT
  require_offsite_setting "${KAIROS_OFFSITE_REGION:-}" KAIROS_OFFSITE_REGION
  require_offsite_setting "${KAIROS_OFFSITE_ACCESS_KEY_ID:-}" KAIROS_OFFSITE_ACCESS_KEY_ID
  require_offsite_setting "${KAIROS_OFFSITE_SECRET_ACCESS_KEY:-}" KAIROS_OFFSITE_SECRET_ACCESS_KEY
  refuse_missing_offsite_settings
  export RCLONE_CONFIG_OFFSITE_TYPE=s3
  export RCLONE_CONFIG_OFFSITE_PROVIDER=Other
  export RCLONE_CONFIG_OFFSITE_ENDPOINT="$KAIROS_OFFSITE_ENDPOINT"
  export RCLONE_CONFIG_OFFSITE_REGION="$KAIROS_OFFSITE_REGION"
  export RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="$KAIROS_OFFSITE_ACCESS_KEY_ID"
  export RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="$KAIROS_OFFSITE_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_OFFSITE_FORCE_PATH_STYLE=true
  export RCLONE_CONFIG_OFFSITE_NO_CHECK_BUCKET=true
  offsite_destination="offsite:$KAIROS_OFFSITE_BUCKET"
fi
