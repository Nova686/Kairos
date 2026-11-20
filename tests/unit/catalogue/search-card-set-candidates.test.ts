import { describe, expect, it } from 'vitest'
import { users } from '../../../server/database/schema/index.ts'
import { createProduct } from '../../../server/domain/catalogue/catalogue-service.ts'
import {
  searchCardSetCandidates,
  type CardSetSearchDependencies,
} from '../../../server/domain/catalogue/search-card-set-candidates.ts'
import { emptyProductDraft } from '../../../shared/catalogue/product-draft.ts'
import type { CardSetCard } from '../../../src/price-sources/card-candidate.ts'
import { SourceBlockedError } from '../../../src/price-sources/price-source-types.ts'
import type { KairosDatabase } from '../../../server/database/open-database.ts'
import { createTestDatabase } from '../../support/create-test-database.ts'

const insertUser = async (database: KairosDatabase): Promise<string> => {
  const [user] = await database
    .insert(users)
    .values({ email: 'a@example.com', displayName: 'A', passwordHash: 'x' })
    .returning()
  return user!.id
}

const setCard = (localId: string, name: string): CardSetCard => ({
  source: 'tcgdex',
  sourceCardId: `sv08.5-${localId}`,
  name,
  setName: 'Évolutions Prismatiques',
  imageUrl: `https://img/${localId}`,
  cardNumber: `${localId}/131`,
})

const prismaticEvolutions: CardSetSearchDependencies = {
  listTcgdexSetCards: async () => [
    setCard('001', 'Noeunoeuf'),
    setCard('014', 'Pyroli-ex'),
    setCard('146', 'Pyroli-ex'),
    setCard('155', 'Évoli'),
  ],
}

describe('searchCardSetCandidates', () => {
  it('lists every card of the set when nothing is typed, numbered and filed under the set', async () => {
    const database = await createTestDatabase()

    const { candidates, unavailableSources } = await searchCardSetCandidates(database, 'sv08.5', '  ', prismaticEvolutions)

    expect(candidates.map(candidate => candidate.label)).toEqual([
      '001/131 · Noeunoeuf',
      '014/131 · Pyroli-ex',
      '146/131 · Pyroli-ex',
      '155/131 · Évoli',
    ])
    expect(candidates[1]).toMatchObject({
      origin: 'tcgdex',
      productId: null,
      imageUrl: 'https://img/014',
      draft: {
        name: 'Pyroli-ex',
        category: 'graded-card',
        seriesName: 'Évolutions Prismatiques',
        tcgdexCardId: 'sv08.5-014',
        imageUrl: 'https://img/014',
      },
    })
    expect(unavailableSources).toEqual([])
  })

  it('keeps the cards whose name or number holds every typed word, accent-insensitively', async () => {
    const database = await createTestDatabase()

    const byName = await searchCardSetCandidates(database, 'sv08.5', 'EVOLI', prismaticEvolutions)
    const byNameAndNumber = await searchCardSetCandidates(database, 'sv08.5', 'pyroli 146', prismaticEvolutions)

    expect(byName.candidates.map(candidate => candidate.label)).toEqual(['155/131 · Évoli'])
    expect(byNameAndNumber.candidates.map(candidate => candidate.label)).toEqual(['146/131 · Pyroli-ex'])
  })

  it('shows a card already in the catalogue once, as a catalogue candidate listed first', async () => {
    const database = await createTestDatabase()
    const userId = await insertUser(database)
    await createProduct(database, userId, { ...emptyProductDraft('Pyroli-ex', 'graded-card'), tcgdexCardId: 'sv08.5-146' })

    const { candidates } = await searchCardSetCandidates(database, 'sv08.5', 'pyroli', prismaticEvolutions)

    expect(candidates.map(candidate => [candidate.origin, candidate.label])).toEqual([
      ['catalogue', 'Pyroli-ex'],
      ['tcgdex', '014/131 · Pyroli-ex'],
    ])
  })

  it('reports a blocked TCGdex as unavailable', async () => {
    const database = await createTestDatabase()
    const blockedTcgdex: CardSetSearchDependencies = {
      listTcgdexSetCards: async () => {
        throw new SourceBlockedError('tcgdex', 'HTTP 429')
      },
    }

    const { candidates, unavailableSources } = await searchCardSetCandidates(database, 'sv08.5', '', blockedTcgdex)

    expect(candidates).toEqual([])
    expect(unavailableSources).toEqual(['tcgdex'])
  })
})
