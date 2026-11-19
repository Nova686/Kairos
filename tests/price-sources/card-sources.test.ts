import { readFileSync } from 'node:fs'
import {
  fetchTcgdexCardAggregate,
  listTcgdexCardSets,
  listTcgdexSetCards,
  searchTcgdexCards,
} from '../../src/price-sources/tcgdex/tcgdex-adapter.ts'

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

  it('lists the card sets latest first, without the Pocket ones', async () => {
    const { requests, fetchFunction } = recordingFetch('tcgdex/sets-latest-first.json')
    const cardSets = await listTcgdexCardSets(fetchFunction)
    expect(requests[0]?.url).toBe(
      'https://api.tcgdex.net/v2/fr/sets?serie.id=neq%3Atcgp&sort%3Afield=releaseDate&sort%3Aorder=DESC',
    )
    expect(cardSets[0]).toEqual({ id: 'me06', name: 'Règne Delta', cardCount: 141 })
    expect(cardSets).toHaveLength(4)
  })

  it('lists every card of a set with its number and the set name', async () => {
    const { requests, fetchFunction } = recordingFetch('tcgdex/set-sv08.5.json')
    const setCards = await listTcgdexSetCards('sv08.5', fetchFunction)
    expect(requests[0]?.url).toBe('https://api.tcgdex.net/v2/fr/sets/sv08.5')
    expect(setCards.map(setCard => setCard.cardNumber)).toEqual(['001/131', '002/131', '014/131', '146/131'])
    expect(setCards[2]).toEqual({
      source: 'tcgdex',
      sourceCardId: 'sv08.5-014',
      name: 'Pyroli-ex',
      setName: 'Évolutions Prismatiques',
      imageUrl: 'https://assets.tcgdex.net/fr/sv/sv08.5/014/high.webp',
      cardNumber: '014/131',
    })
    expect(setCards[3]?.imageUrl).toBeNull()
  })

  it('finds no card in an unknown set', async () => {
    const notFoundFetch = async (): Promise<Response> => new Response('', { status: 404 })
    expect(await listTcgdexSetCards('nope', notFoundFetch)).toEqual([])
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
