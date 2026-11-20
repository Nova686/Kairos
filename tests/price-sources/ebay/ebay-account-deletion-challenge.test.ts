import {
  computeEbayChallengeResponse,
  isEbayAccountDeletionConfigured,
} from '../../../src/price-sources/ebay/ebay-account-deletion-challenge.ts'

const configuredSettings = {
  verificationToken: 'kairos_verification_token_0123456789abcdef',
  endpoint: 'https://kairos.example.fr/api/ebay/account-deletion',
}

describe('computeEbayChallengeResponse', () => {
  it('hashes the challenge code, the verification token and the endpoint in that order, as eBay does', () => {
    expect(computeEbayChallengeResponse('challenge-from-ebay', configuredSettings))
      .toBe('5a0595abb5a7bb708d6f43a3095e302bdba12af557581bcaf1ee2c4fd1e8a439')
  })
})

describe('isEbayAccountDeletionConfigured', () => {
  it('needs both the verification token and the endpoint', () => {
    expect(isEbayAccountDeletionConfigured(configuredSettings)).toBe(true)
    expect(isEbayAccountDeletionConfigured({ ...configuredSettings, verificationToken: '' })).toBe(false)
    expect(isEbayAccountDeletionConfigured({ ...configuredSettings, endpoint: '' })).toBe(false)
  })
})
