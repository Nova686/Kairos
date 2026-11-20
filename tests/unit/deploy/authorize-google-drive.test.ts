import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { authorizeGoogleDrive, saveRcloneDriveToken } from '../../../deploy/backup/authorize-google-drive.mts'

const googleClient = { clientId: 'kairos-client.apps.googleusercontent.com', clientSecret: 'kairos-client-secret' }

const deviceCodeAnswer = {
  device_code: 'device-code',
  user_code: 'ABCD-EFGH',
  verification_url: 'https://www.google.com/device',
  expires_in: 1800,
  interval: 5,
}

const grantedTokenAnswer = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  token_type: 'Bearer',
  expires_in: 3599,
}

interface RecordedGoogleRequest {
  endpoint: string
  formFields: Record<string, string>
}

const scriptedGoogle = (answers: unknown[], readClock: () => number = () => 0) => {
  const recordedRequests: RecordedGoogleRequest[] = []
  const waitedSeconds: number[] = []
  const shownInstructions: string[] = []
  let clockMilliseconds = readClock()
  const fetchFunction = (async (endpoint: string | URL | Request, requestInit?: RequestInit) => {
    recordedRequests.push({
      endpoint: String(endpoint),
      formFields: Object.fromEntries(new URLSearchParams(String(requestInit?.body ?? ''))),
    })
    const answer = answers[Math.min(recordedRequests.length - 1, answers.length - 1)]
    return new Response(JSON.stringify(answer))
  }) as typeof fetch
  const dependencies = {
    fetchFunction,
    waitSeconds: async (seconds: number) => {
      waitedSeconds.push(seconds)
      clockMilliseconds += seconds * 1000
    },
    readClock: () => clockMilliseconds,
    showInstructions: (verificationUrl: string, userCode: string, validMinutes: number) => {
      shownInstructions.push(`${verificationUrl} ${userCode} ${validMinutes}`)
    },
  }
  return { dependencies, recordedRequests, waitedSeconds, shownInstructions }
}

const temporaryDirectories: string[] = []

afterEach(() => {
  temporaryDirectories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }))
})

describe('authorizeGoogleDrive', () => {
  it('shows the code to type on google.com/device and returns a refreshable token once the owner approves', async () => {
    const { dependencies, recordedRequests, waitedSeconds, shownInstructions } = scriptedGoogle([
      deviceCodeAnswer,
      { error: 'authorization_pending' },
      grantedTokenAnswer,
    ])

    const driveToken = await authorizeGoogleDrive(googleClient, dependencies)

    expect(shownInstructions).toEqual(['https://www.google.com/device ABCD-EFGH 30'])
    expect(recordedRequests[0]).toEqual({
      endpoint: 'https://oauth2.googleapis.com/device/code',
      formFields: { client_id: googleClient.clientId, scope: 'https://www.googleapis.com/auth/drive.file' },
    })
    expect(recordedRequests[2]).toEqual({
      endpoint: 'https://oauth2.googleapis.com/token',
      formFields: {
        client_id: googleClient.clientId,
        client_secret: googleClient.clientSecret,
        device_code: 'device-code',
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      },
    })
    expect(waitedSeconds).toEqual([5, 5])
    expect(driveToken).toEqual({
      access_token: 'access-token',
      token_type: 'Bearer',
      refresh_token: 'refresh-token',
      expiry: new Date(10_000 + 3599 * 1000).toISOString(),
    })
  })

  it('waits five seconds longer each time Google asks to slow down', async () => {
    const { dependencies, waitedSeconds } = scriptedGoogle([
      deviceCodeAnswer,
      { error: 'slow_down' },
      { error: 'slow_down' },
      grantedTokenAnswer,
    ])

    await authorizeGoogleDrive(googleClient, dependencies)

    expect(waitedSeconds).toEqual([5, 10, 15])
  })

  it('stops when the owner refuses the access', async () => {
    const { dependencies } = scriptedGoogle([deviceCodeAnswer, { error: 'access_denied' }])

    await expect(authorizeGoogleDrive(googleClient, dependencies)).rejects.toThrow('Accès refusé dans Google')
  })

  it('stops once the code has expired without an answer', async () => {
    const { dependencies, recordedRequests } = scriptedGoogle([
      { ...deviceCodeAnswer, expires_in: 12 },
      { error: 'authorization_pending' },
    ])

    await expect(authorizeGoogleDrive(googleClient, dependencies)).rejects.toThrow('Le code a expiré')
    expect(recordedRequests).toHaveLength(4)
  })

  it('reports why Google refuses the client', async () => {
    const { dependencies } = scriptedGoogle([{ error: 'invalid_client', error_description: 'The OAuth client was not found.' }])

    await expect(authorizeGoogleDrive(googleClient, dependencies)).rejects.toThrow('The OAuth client was not found.')
  })

  it('reports a token answer without a refresh token instead of saving an access that dies within the hour', async () => {
    const { dependencies } = scriptedGoogle([deviceCodeAnswer, { access_token: 'access-token', expires_in: 3599 }])

    await expect(authorizeGoogleDrive(googleClient, dependencies)).rejects.toThrow('réponse inattendue')
  })
})

describe('saveRcloneDriveToken', () => {
  it('writes the token where the copy reads it, readable by its owner only', async () => {
    const credentialsDirectory = mkdtempSync(join(tmpdir(), 'kairos-drive-token-'))
    temporaryDirectories.push(credentialsDirectory)
    const tokenFile = join(credentialsDirectory, 'google-drive-token.json')
    const driveToken = { access_token: 'access', token_type: 'Bearer', refresh_token: 'refresh', expiry: '2026-11-20T12:00:00.000Z' }

    await saveRcloneDriveToken(tokenFile, driveToken)

    expect(JSON.parse(readFileSync(tokenFile, 'utf8'))).toEqual(driveToken)
    expect(statSync(tokenFile).mode & 0o777).toBe(0o600)
  })
})
