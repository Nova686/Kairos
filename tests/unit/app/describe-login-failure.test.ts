import { describe, expect, it } from 'vitest'
import { describeLoginFailure } from '../../../app/utils/describe-login-failure.ts'

describe('describeLoginFailure', () => {
  it('relays the server message when too many attempts were made', () => {
    expect(describeLoginFailure({ statusCode: 429, data: { statusMessage: 'Trop de tentatives de connexion. Réessayez dans une minute.' } }))
      .toBe('Trop de tentatives de connexion. Réessayez dans une minute.')
  })

  it('answers wrong credentials only when the server refused them', () => {
    expect(describeLoginFailure({ statusCode: 401, data: { statusMessage: 'Email ou mot de passe incorrect' } }))
      .toBe('Email ou mot de passe incorrect.')
  })

  it('asks for both fields when the server received an empty one', () => {
    expect(describeLoginFailure({ statusCode: 422, data: { statusMessage: 'Corps de requête invalide' } }))
      .toBe('Saisissez votre email et votre mot de passe.')
  })

  it('tells a server or network failure apart from wrong credentials', () => {
    expect(describeLoginFailure({ statusCode: 500 })).toBe('Connexion impossible pour le moment, réessayez dans un instant.')
    expect(describeLoginFailure(new Error('network down'))).toBe('Connexion impossible pour le moment, réessayez dans un instant.')
  })
})
