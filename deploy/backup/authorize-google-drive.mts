import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { setTimeout as waitMilliseconds } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const deviceCodeEndpoint = 'https://oauth2.googleapis.com/device/code'
const tokenEndpoint = 'https://oauth2.googleapis.com/token'
const deviceCodeGrantType = 'urn:ietf:params:oauth:grant-type:device_code'
const driveFileScope = 'https://www.googleapis.com/auth/drive.file'
const defaultPollingSeconds = 5
const slowDownExtraSeconds = 5
const defaultTokenFile = '/drive-credentials/google-drive-token.json'

export interface GoogleDriveClient {
  clientId: string
  clientSecret: string
}

export interface RcloneDriveToken {
  access_token: string
  token_type: string
  refresh_token: string
  expiry: string
}

interface DeviceCodeAnswer {
  device_code?: string
  user_code?: string
  verification_url?: string
  expires_in?: number
  interval?: number
  error?: string
  error_description?: string
}

interface TokenAnswer {
  access_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  error?: string
  error_description?: string
}

export interface GoogleDriveAuthorizationDependencies {
  fetchFunction?: typeof fetch
  waitSeconds?: (seconds: number) => Promise<void>
  readClock?: () => number
  showInstructions?: (verificationUrl: string, userCode: string, validMinutes: number) => void
}

const postForm = async <Answer,>(fetchFunction: typeof fetch, endpoint: string, formFields: Record<string, string>): Promise<Answer> => {
  const response = await fetchFunction(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formFields).toString(),
  })
  return await response.json() as Answer
}

const describeGoogleRefusal = (answer: { error?: string; error_description?: string }): string =>
  answer.error_description ?? answer.error ?? 'réponse inattendue'

const printInstructions = (verificationUrl: string, userCode: string, validMinutes: number): void => {
  console.log(`Sur ton téléphone ou ton ordinateur, ouvre ${verificationUrl} et saisis le code ${userCode}.`)
  console.log(`Choisis le compte Google qui recevra les sauvegardes. Le code reste valable ${validMinutes} minutes.`)
}

export const authorizeGoogleDrive = async (
  { clientId, clientSecret }: GoogleDriveClient,
  {
    fetchFunction = fetch,
    waitSeconds = seconds => waitMilliseconds(seconds * 1000),
    readClock = Date.now,
    showInstructions = printInstructions,
  }: GoogleDriveAuthorizationDependencies = {},
): Promise<RcloneDriveToken> => {
  const deviceCode = await postForm<DeviceCodeAnswer>(fetchFunction, deviceCodeEndpoint, { client_id: clientId, scope: driveFileScope })
  if (!deviceCode.device_code || !deviceCode.user_code || !deviceCode.verification_url || !deviceCode.expires_in) {
    throw new Error(`Google refuse la demande d'accès : ${describeGoogleRefusal(deviceCode)}`)
  }
  showInstructions(deviceCode.verification_url, deviceCode.user_code, Math.floor(deviceCode.expires_in / 60))
  const deadline = readClock() + deviceCode.expires_in * 1000
  let pollingSeconds = deviceCode.interval ?? defaultPollingSeconds
  while (readClock() < deadline) {
    await waitSeconds(pollingSeconds)
    const tokenAnswer = await postForm<TokenAnswer>(fetchFunction, tokenEndpoint, {
      client_id: clientId,
      client_secret: clientSecret,
      device_code: deviceCode.device_code,
      grant_type: deviceCodeGrantType,
    })
    if (tokenAnswer.access_token && tokenAnswer.refresh_token) {
      return {
        access_token: tokenAnswer.access_token,
        token_type: tokenAnswer.token_type ?? 'Bearer',
        refresh_token: tokenAnswer.refresh_token,
        expiry: new Date(readClock() + (tokenAnswer.expires_in ?? 0) * 1000).toISOString(),
      }
    }
    if (tokenAnswer.error === 'authorization_pending') {
      continue
    }
    if (tokenAnswer.error === 'slow_down') {
      pollingSeconds += slowDownExtraSeconds
      continue
    }
    if (tokenAnswer.error === 'access_denied') {
      throw new Error('Accès refusé dans Google : relance la commande pour recommencer.')
    }
    throw new Error(`Google refuse l'accès : ${describeGoogleRefusal(tokenAnswer)}`)
  }
  throw new Error('Le code a expiré sans réponse : relance la commande pour en obtenir un nouveau.')
}

export const saveRcloneDriveToken = async (tokenFile: string, driveToken: RcloneDriveToken): Promise<void> => {
  await mkdir(dirname(tokenFile), { recursive: true })
  await writeFile(tokenFile, JSON.stringify(driveToken), { mode: 0o600 })
  await chmod(tokenFile, 0o600)
}

const authorizeFromCommandLine = async (): Promise<void> => {
  const clientId = process.env.KAIROS_DRIVE_CLIENT_ID ?? ''
  const clientSecret = process.env.KAIROS_DRIVE_CLIENT_SECRET ?? ''
  const missingSettings = [
    ...(clientId ? [] : ['KAIROS_DRIVE_CLIENT_ID']),
    ...(clientSecret ? [] : ['KAIROS_DRIVE_CLIENT_SECRET']),
  ]
  if (missingSettings.length > 0) {
    throw new Error(`Autorisation Google Drive impossible, à renseigner dans deploy/.env : ${missingSettings.join(' ')}`)
  }
  const driveToken = await authorizeGoogleDrive({ clientId, clientSecret })
  await saveRcloneDriveToken(process.env.KAIROS_DRIVE_TOKEN_FILE ?? defaultTokenFile, driveToken)
  console.log('Accès accordé : Kairos copiera ses sauvegardes dans ton Google Drive.')
}

const commandLineScript = process.argv[1]
if (commandLineScript && import.meta.url === pathToFileURL(commandLineScript).href) {
  authorizeFromCommandLine().catch((authorizationFailure: unknown) => {
    console.error(authorizationFailure instanceof Error ? authorizationFailure.message : authorizationFailure)
    process.exitCode = 1
  })
}
