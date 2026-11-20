export const userSessionRenewalIntervalMilliseconds = 24 * 60 * 60 * 1000

export const isUserSessionDueForRenewal = (lastRenewedAt: number | undefined, currentTime: number): boolean =>
  lastRenewedAt === undefined || currentTime - lastRenewedAt >= userSessionRenewalIntervalMilliseconds
