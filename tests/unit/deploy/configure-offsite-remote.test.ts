import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const copyScriptPath = fileURLToPath(new URL('../../../deploy/backup/copy-backups-offsite.sh', import.meta.url))
const rcloneWrapperPath = fileURLToPath(new URL('../../../deploy/backup/run-rclone-on-offsite-remote.sh', import.meta.url))

const recordingRclone = `#!/bin/sh
{
  printf 'arguments=%s\\n' "$*"
  printf 'type=%s\\n' "\${RCLONE_CONFIG_OFFSITE_TYPE:-}"
  printf 'client_id=%s\\n' "\${RCLONE_CONFIG_OFFSITE_CLIENT_ID:-}"
  printf 'client_secret=%s\\n' "\${RCLONE_CONFIG_OFFSITE_CLIENT_SECRET:-}"
  printf 'scope=%s\\n' "\${RCLONE_CONFIG_OFFSITE_SCOPE:-}"
  printf 'use_trash=%s\\n' "\${RCLONE_CONFIG_OFFSITE_USE_TRASH:-}"
  printf 'token=%s\\n' "\${RCLONE_CONFIG_OFFSITE_TOKEN:-}"
  printf 'endpoint=%s\\n' "\${RCLONE_CONFIG_OFFSITE_ENDPOINT:-}"
  printf 'access_key_id=%s\\n' "\${RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID:-}"
} >> "$RCLONE_CALL_LOG"
`

const driveToken = '{"access_token":"access","token_type":"Bearer","refresh_token":"refresh","expiry":"2026-11-20T12:00:00.000Z"}'

const driveSettings = {
  KAIROS_DRIVE_CLIENT_ID: 'kairos-client.apps.googleusercontent.com',
  KAIROS_DRIVE_CLIENT_SECRET: 'kairos-client-secret',
}

const s3Settings = {
  KAIROS_OFFSITE_BUCKET: 'kairos-sauvegardes',
  KAIROS_OFFSITE_ENDPOINT: 'https://s3.example.test',
  KAIROS_OFFSITE_REGION: 'eu-paris-1',
  KAIROS_OFFSITE_ACCESS_KEY_ID: 'offsite-access',
  KAIROS_OFFSITE_SECRET_ACCESS_KEY: 'offsite-secret',
}

const temporaryDirectories: string[] = []

afterEach(() => {
  temporaryDirectories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }))
})

const prepareOffsiteRun = ({ withDriveToken }: { withDriveToken: boolean }) => {
  const workingDirectory = mkdtempSync(join(tmpdir(), 'kairos-offsite-remote-'))
  temporaryDirectories.push(workingDirectory)
  const backupDirectory = join(workingDirectory, 'backups')
  const stubDirectory = join(workingDirectory, 'bin')
  const tokenFile = join(workingDirectory, 'drive-credentials', 'google-drive-token.json')
  const rcloneCallLog = join(workingDirectory, 'rclone-calls.log')
  mkdirSync(backupDirectory)
  mkdirSync(stubDirectory)
  mkdirSync(join(workingDirectory, 'drive-credentials'))
  writeFileSync(join(backupDirectory, 'kairos-2026-11-20.dump'), 'fresh dump')
  writeFileSync(join(stubDirectory, 'rclone'), recordingRclone)
  chmodSync(join(stubDirectory, 'rclone'), 0o755)
  if (withDriveToken) {
    writeFileSync(tokenFile, driveToken)
  }
  const runScript = (scriptPath: string, settings: Record<string, string>, scriptArguments: string[] = []) => spawnSync('sh', [scriptPath, ...scriptArguments], {
    encoding: 'utf8',
    env: {
      PATH: `${stubDirectory}:${process.env.PATH}`,
      BACKUP_DIRECTORY: backupDirectory,
      KAIROS_DRIVE_TOKEN_FILE: tokenFile,
      RCLONE_CALL_LOG: rcloneCallLog,
      ...settings,
    },
  })
  const readRcloneCalls = (): string[] => {
    try {
      return readFileSync(rcloneCallLog, 'utf8').split('arguments=').slice(1).map(rcloneCall => `arguments=${rcloneCall}`)
    }
    catch {
      return []
    }
  }
  return { backupDirectory, runScript, readRcloneCalls }
}

describe('offsite copy to Google Drive', () => {
  it('copies the dumps into the Drive folder of Kairos with the authorized token, restricted to the files it created', () => {
    const { backupDirectory, runScript, readRcloneCalls } = prepareOffsiteRun({ withDriveToken: true })

    const copyRun = runScript(copyScriptPath, driveSettings)

    expect(copyRun.status).toBe(0)
    expect(copyRun.stdout).toContain('offsite copy done: offsite:Sauvegardes Kairos')
    const [copyCall, listingCall] = readRcloneCalls()
    expect(copyCall).toContain(`arguments=copy ${backupDirectory} offsite:Sauvegardes Kairos --include kairos-*.dump\n`)
    expect(copyCall).toContain('type=drive\n')
    expect(copyCall).toContain(`client_id=${driveSettings.KAIROS_DRIVE_CLIENT_ID}\n`)
    expect(copyCall).toContain(`client_secret=${driveSettings.KAIROS_DRIVE_CLIENT_SECRET}\n`)
    expect(copyCall).toContain('scope=drive.file\n')
    expect(copyCall).toContain('use_trash=false\n')
    expect(copyCall).toContain(`token=${driveToken}\n`)
    expect(listingCall).toContain('arguments=lsf offsite:Sauvegardes Kairos --files-only --include kairos-*.dump\n')
  })

  it('uses the Drive folder named in the settings', () => {
    const { runScript, readRcloneCalls } = prepareOffsiteRun({ withDriveToken: true })

    const copyRun = runScript(copyScriptPath, { ...driveSettings, KAIROS_DRIVE_FOLDER: 'Kairos/Base' })

    expect(copyRun.status).toBe(0)
    expect(readRcloneCalls()[0]).toContain(' offsite:Kairos/Base --include')
  })

  it('refuses to copy before the Google account has been authorized', () => {
    const { runScript, readRcloneCalls } = prepareOffsiteRun({ withDriveToken: false })

    const copyRun = runScript(copyScriptPath, driveSettings)

    expect(copyRun.status).not.toBe(0)
    expect(copyRun.stderr).toContain('run --rm google-drive-authorize')
    expect(readRcloneCalls()).toEqual([])
  })

  it('names the missing Drive secret', () => {
    const { runScript, readRcloneCalls } = prepareOffsiteRun({ withDriveToken: true })

    const copyRun = runScript(copyScriptPath, { KAIROS_DRIVE_CLIENT_ID: driveSettings.KAIROS_DRIVE_CLIENT_ID })

    expect(copyRun.status).not.toBe(0)
    expect(copyRun.stderr).toContain('à renseigner dans deploy/.env : KAIROS_DRIVE_CLIENT_SECRET')
    expect(readRcloneCalls()).toEqual([])
  })

  it('lets the restore commands reach the same Drive folder', () => {
    const { backupDirectory, runScript, readRcloneCalls } = prepareOffsiteRun({ withDriveToken: true })

    const restoreRun = runScript(rcloneWrapperPath, driveSettings, ['copy', 'offsite:Sauvegardes Kairos/kairos-2026-11-19.dump', backupDirectory])

    expect(restoreRun.status).toBe(0)
    const [restoreCall] = readRcloneCalls()
    expect(restoreCall).toContain(`arguments=copy offsite:Sauvegardes Kairos/kairos-2026-11-19.dump ${backupDirectory}\n`)
    expect(restoreCall).toContain('type=drive\n')
    expect(restoreCall).toContain(`token=${driveToken}\n`)
  })
})

describe('offsite copy to S3 storage', () => {
  it('still copies to the S3 bucket when no Google Drive client is set', () => {
    const { backupDirectory, runScript, readRcloneCalls } = prepareOffsiteRun({ withDriveToken: true })

    const copyRun = runScript(copyScriptPath, s3Settings)

    expect(copyRun.status).toBe(0)
    const [copyCall] = readRcloneCalls()
    expect(copyCall).toContain(`arguments=copy ${backupDirectory} offsite:kairos-sauvegardes --include kairos-*.dump\n`)
    expect(copyCall).toContain('type=s3\n')
    expect(copyCall).toContain('endpoint=https://s3.example.test\n')
    expect(copyCall).toContain('access_key_id=offsite-access\n')
    expect(copyCall).toContain('token=\n')
  })

  it('names every missing S3 setting', () => {
    const { runScript, readRcloneCalls } = prepareOffsiteRun({ withDriveToken: false })

    const copyRun = runScript(copyScriptPath, { KAIROS_OFFSITE_BUCKET: 'kairos-sauvegardes' })

    expect(copyRun.status).not.toBe(0)
    expect(copyRun.stderr).toContain(
      'à renseigner dans deploy/.env : KAIROS_OFFSITE_ENDPOINT KAIROS_OFFSITE_REGION KAIROS_OFFSITE_ACCESS_KEY_ID KAIROS_OFFSITE_SECRET_ACCESS_KEY',
    )
    expect(readRcloneCalls()).toEqual([])
  })
})
