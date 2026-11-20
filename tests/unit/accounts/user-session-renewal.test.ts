import {
  isUserSessionDueForRenewal,
  userSessionRenewalIntervalMilliseconds,
} from '../../../server/domain/accounts/user-session-renewal.ts'

describe('isUserSessionDueForRenewal', () => {
  const currentTime = Date.UTC(2026, 10, 20, 12)

  it('renews a session never renewed since sign in', () => {
    expect(isUserSessionDueForRenewal(undefined, currentTime)).toBe(true)
  })

  it('leaves a session renewed less than a day ago untouched', () => {
    expect(isUserSessionDueForRenewal(currentTime - userSessionRenewalIntervalMilliseconds + 1, currentTime)).toBe(false)
  })

  it('renews a session last renewed a day ago or more', () => {
    expect(isUserSessionDueForRenewal(currentTime - userSessionRenewalIntervalMilliseconds, currentTime)).toBe(true)
    expect(isUserSessionDueForRenewal(currentTime - 300 * userSessionRenewalIntervalMilliseconds, currentTime)).toBe(true)
  })
})
