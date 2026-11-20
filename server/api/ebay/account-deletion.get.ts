import { computeEbayChallengeResponse } from '../../../src/price-sources/ebay/ebay-account-deletion-challenge.ts'

export default defineEventHandler((event) => {
  const settings = readEbayAccountDeletionSettings(event)
  const challengeCode = getQuery(event).challenge_code
  if (typeof challengeCode !== 'string' || challengeCode === '') {
    throw createError({ statusCode: 400, statusMessage: 'challenge_code manquant' })
  }
  return { challengeResponse: computeEbayChallengeResponse(challengeCode, settings) }
})
