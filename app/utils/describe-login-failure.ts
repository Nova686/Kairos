type LoginFailure = { statusCode?: number, data?: { statusMessage?: string } }

const wrongCredentialsStatusCode = 401
const incompleteFormStatusCode = 422
const tooManyRequestsStatusCode = 429

export const describeLoginFailure = (failure: unknown): string => {
  const loginFailure = failure as LoginFailure
  if (loginFailure.statusCode === tooManyRequestsStatusCode && loginFailure.data?.statusMessage) {
    return loginFailure.data.statusMessage
  }
  if (loginFailure.statusCode === wrongCredentialsStatusCode) {
    return 'Email ou mot de passe incorrect.'
  }
  if (loginFailure.statusCode === incompleteFormStatusCode) {
    return 'Saisissez votre email et votre mot de passe.'
  }
  return 'Connexion impossible pour le moment, réessayez dans un instant.'
}
