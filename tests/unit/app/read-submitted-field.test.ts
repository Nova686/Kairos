// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { readSubmittedField } from '../../../app/utils/read-submitted-field.ts'

const submitFormWith = (passwordShownInField: string): Event => {
  const loginForm = document.createElement('form')
  const passwordInput = document.createElement('input')
  passwordInput.name = 'password'
  passwordInput.value = passwordShownInField
  loginForm.append(passwordInput)
  document.body.append(loginForm)
  let submitEvent: Event | undefined
  loginForm.addEventListener('submit', (dispatchedEvent) => {
    dispatchedEvent.preventDefault()
    submitEvent = dispatchedEvent
  })
  loginForm.dispatchEvent(new Event('submit', { cancelable: true }))
  return submitEvent!
}

describe('readSubmittedField', () => {
  it('takes the value shown in the field when autofill left the typed value empty', () => {
    expect(readSubmittedField(submitFormWith('autofilled-password'), 'password', '')).toBe('autofilled-password')
  })

  it('keeps the typed value when the field is empty or the event has no form', () => {
    expect(readSubmittedField(submitFormWith(''), 'password', 'typed-password')).toBe('typed-password')
    expect(readSubmittedField(undefined, 'password', 'typed-password')).toBe('typed-password')
  })
})
