import { createHash } from 'node:crypto'

export interface EbayAccountDeletionSettings {
  verificationToken: string
  endpoint: string
}

export const isEbayAccountDeletionConfigured = ({ verificationToken, endpoint }: EbayAccountDeletionSettings): boolean =>
  verificationToken !== '' && endpoint !== ''

export const computeEbayChallengeResponse = (
  challengeCode: string,
  { verificationToken, endpoint }: EbayAccountDeletionSettings,
): string =>
  createHash('sha256').update(challengeCode).update(verificationToken).update(endpoint).digest('hex')
