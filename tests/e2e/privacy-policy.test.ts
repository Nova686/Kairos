import { startEndToEndServer, fetch } from '../support/end-to-end-server.ts'

describe('privacy policy', async () => {
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

  it('links the privacy policy from the login page', async () => {
    const loginPage = await (await fetch('/connexion')).text()

    expect(loginPage).toMatch(/href="\/confidentialite"/)
  })

  it('still sends an anonymous visitor of a private page to the login page', async () => {
    const response = await fetch('/stock', { redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/connexion')
  })
})
