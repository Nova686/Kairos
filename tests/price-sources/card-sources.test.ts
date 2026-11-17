import { readFileSync } from 'node:fs'
import { fetchTcgdexCardAggregate, searchTcgdexCards } from '../../src/price-sources/tcgdex/tcgdex-adapter.ts'

const readFixtureText = (fixturePath: string): string =>
  readFileSync(new URL(`../fixtures/${fixturePath}`, import.meta.url), 'utf8')

const recordingFetch = (fixturePath: string) => {
  const requests: { url: string; init: RequestInit }[] = []
  const fetchFunction = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests.push({ url: String(url), init: init ?? {} })
    return new Response(readFixtureText(fixturePath), { status: 200 })
  }
  return { requests, fetchFunction }
}

describe('TCGdex', () => {
  it('finds cards by their French name', async () => {
    const { fetchFunction } = recordingFetch('tcgdex/search-dracaufeu.json')
    const candidates = await searchTcgdexCards('Dracaufeu', fetchFunction)
    expect(candidates.length).toBeGreaterThan(10)
    for (const candidate of candidates) {
      expect(candidate.source).toBe('tcgdex')
      expect(candidate.name).toContain('Dracaufeu')
    }
  })

  it('sends accents and apostrophes percent-encoded', async () => {
    const { requests, fetchFunction } = recordingFetch('tcgdex/search-dracaufeu.json')
    await searchTcgdexCards("Dresseur d'Élite", fetchFunction)
    expect(requests[0]?.url).toBe('https://api.tcgdex.net/v2/fr/cards?name=Dresseur+d%27%C3%89lite')
  })

  it('reads the Cardmarket prices of a card and its Cardmarket id', async () => {
    const { requests, fetchFunction } = recordingFetch('tcgdex/card-sv08.5-161.json')
    const aggregate = await fetchTcgdexCardAggregate('sv08.5-161', fetchFunction)
    expect(requests[0]?.url).toBe('https://api.tcgdex.net/v2/fr/cards/sv08.5-161')
    expect(aggregate).toMatchObject({
      source: 'tcgdex',
      sourceProductId: '805555',
      averageCents: 101899,
      lowCents: 69855,
      trendCents: 91670,
      average7DaysCents: 102337,
      average30DaysCents: 105871,
    })
  })
})
