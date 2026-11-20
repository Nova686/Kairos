import { startEndToEndServer, fetch } from '../support/end-to-end-server.ts'

describe('legal pages', async () => {
  await startEndToEndServer()

  it('shows the privacy policy to an anonymous visitor instead of sending them to the login page', async () => {
    const response = await fetch('/confidentialite', { redirect: 'manual' })
    const policyPage = await response.text()

    expect(response.status).toBe(200)
    expect(policyPage).toContain('Politique de confidentialité')
    expect(policyPage).toContain('Kairos demande seulement l’accès aux fichiers qu’il crée lui-même')
    expect(policyPage).toContain('exigences d’utilisation limitée')
    expect(policyPage).toMatch(/href="https:\/\/myaccount\.google\.com\/permissions"/)
  })

  it('shows the terms of use to an anonymous visitor, with a link to the privacy policy', async () => {
    const response = await fetch('/conditions-utilisation', { redirect: 'manual' })
    const termsPage = await response.text()

    expect(response.status).toBe(200)
    expect(termsPage).toContain('Conditions d’utilisation')
    expect(termsPage).toContain('Un compte se crée uniquement sur invitation.')
    expect(termsPage).toMatch(/href="\/confidentialite"/)
  })

  it('links both legal pages from the login page', async () => {
    const loginPage = await (await fetch('/connexion')).text()

    expect(loginPage).toMatch(/href="\/conditions-utilisation"/)
    expect(loginPage).toMatch(/href="\/confidentialite"/)
  })

  it('still sends an anonymous visitor of a private page to the login page', async () => {
    const response = await fetch('/stock', { redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/connexion')
  })
})
