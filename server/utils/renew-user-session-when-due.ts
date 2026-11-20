import type { H3Event } from 'h3'
import { isUserSessionDueForRenewal } from '../domain/accounts/user-session-renewal'

export const renewUserSessionWhenDue = async (event: H3Event): Promise<void> => {
  const { secure } = await getUserSession(event)
  const currentTime = Date.now()
  if (isUserSessionDueForRenewal(secure?.sessionRenewedAt, currentTime)) {
    await setUserSession(event, { secure: { sessionRenewedAt: currentTime } })
  }
}
