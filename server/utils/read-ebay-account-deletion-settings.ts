import type { H3Event } from 'h3'
import {
  isEbayAccountDeletionConfigured,
  type EbayAccountDeletionSettings,
} from '../../src/price-sources/ebay/ebay-account-deletion-challenge.ts'

export const readEbayAccountDeletionSettings = (event: H3Event): EbayAccountDeletionSettings => {
  const runtimeConfig = useRuntimeConfig(event)
  const settings = {
    verificationToken: String(runtimeConfig.ebayVerificationToken ?? ''),
    endpoint: String(runtimeConfig.ebayAccountDeletionEndpoint ?? ''),
  }
  if (!isEbayAccountDeletionConfigured(settings)) {
    throw createError({ statusCode: 404, statusMessage: 'Notifications eBay non configurées' })
  }
  return settings
}
