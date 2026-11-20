import { createHash } from 'node:crypto'
import { startEndToEndServer, fetch } from '../support/end-to-end-server.ts'

const verificationToken = 'kairos_verification_token_0123456789abcdef'
const endpoint = 'https://kairos.example.fr/api/ebay/account-deletion'

describe('eBay marketplace account deletion notifications', async () => {
  const previousToken = process.env.NUXT_EBAY_VERIFICATION_TOKEN
  const previousEndpoint = process.env.NUXT_EBAY_ACCOUNT_DELETION_ENDPOINT
  process.env.NUXT_EBAY_VERIFICATION_TOKEN = verificationToken
  process.env.NUXT_EBAY_ACCOUNT_DELETION_ENDPOINT = endpoint
  await startEndToEndServer()
  afterAll(() => {
    if (previousToken === undefined) delete process.env.NUXT_EBAY_VERIFICATION_TOKEN
    else process.env.NUXT_EBAY_VERIFICATION_TOKEN = previousToken
    if (previousEndpoint === undefined) delete process.env.NUXT_EBAY_ACCOUNT_DELETION_ENDPOINT
    else process.env.NUXT_EBAY_ACCOUNT_DELETION_ENDPOINT = previousEndpoint
  })

  it('answers the eBay challenge without a session, as JSON', async () => {
    const response = await fetch('/api/ebay/account-deletion?challenge_code=challenge-from-ebay')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({
      challengeResponse: createHash('sha256').update(`challenge-from-ebay${verificationToken}${endpoint}`).digest('hex'),
    })
  })

  it('refuses a verification request without challenge code', async () => {
    expect((await fetch('/api/ebay/account-deletion')).status).toBe(400)
  })

  it('acknowledges an anonymous deletion notification', async () => {
    const response = await fetch('/api/ebay/account-deletion', {
      method: 'POST',
      body: JSON.stringify({ metadata: { topic: 'MARKETPLACE_ACCOUNT_DELETION' }, notification: { data: { userId: 'ebay-user' } } }),
      headers: { 'content-type': 'application/json' },
    })

    expect(response.status).toBe(204)
  })

  it('keeps every other eBay path behind the session', async () => {
    expect((await fetch('/api/ebay/account-deletion', { method: 'DELETE' })).status).toBe(401)
  })
})
