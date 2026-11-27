import { describe, expect, it } from 'vitest'
import { cardmarketProducts, users } from '../../../server/database/schema/index.ts'
import { createProduct } from '../../../server/domain/catalogue/catalogue-service.ts'
import {
  listSealedCardSets,
  searchSealedSetCandidates,
  type SealedSetSearchDependencies,
} from '../../../server/domain/catalogue/search-sealed-set-candidates.ts'
import { emptyProductDraft } from '../../../shared/catalogue/product-draft.ts'
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

const insertSealedProducts = async (database: KairosDatabase): Promise<void> => {
  await database.insert(cardmarketProducts).values([
    { idProduct: 1, name: 'Prismatic Evolutions Booster', categoryName: 'Pokémon Booster', idExpansion: 10 },
    { idProduct: 2, name: 'Prismatic Evolutions Elite Trainer Box', categoryName: 'Pokémon Elite Trainer Boxes', idExpansion: 10 },
    { idProduct: 3, name: 'Prismatic Evolutions Booster Bundle', categoryName: 'Pokémon Box Set', idExpansion: 10 },
    { idProduct: 4, name: 'Surging Sparks Booster', categoryName: 'Pokémon Booster', idExpansion: 20 },
  ])
}

const prismaticSetNames: SealedSetSearchDependencies = {
  listCardSetNames: async () => [
    { id: 'sv08.5', frenchName: 'Évolutions Prismatiques', englishName: 'Prismatic Evolutions' },
    { id: 'sv08', frenchName: 'Étincelles Déferlantes', englishName: 'Surging Sparks' },
    { id: 'sv07', frenchName: 'Couronne Stellaire', englishName: 'Stellar Crown' },
  ],
}

describe('listSealedCardSets', () => {
  it('lists, in TCGdex order, only the sets holding sealed products, with their French name and count', async () => {
    const database = await createTestDatabase()
    await insertSealedProducts(database)

    expect(await listSealedCardSets(database, prismaticSetNames)).toEqual([
      { id: 'sv08.5', name: 'Évolutions Prismatiques', sealedProductCount: 3 },
      { id: 'sv08', name: 'Étincelles Déferlantes', sealedProductCount: 1 },
    ])
  })

  it('lets a TCGdex failure through', async () => {
    const database = await createTestDatabase()

    await expect(listSealedCardSets(database, {
      listCardSetNames: async () => {
        throw new SourceBlockedError('tcgdex', 'blocked')
      },
    })).rejects.toThrow(SourceBlockedError)
  })
})

describe('searchSealedSetCandidates', () => {
  it('lists every sealed product of the set for an empty query, ETB first, as pokemon-sealed drafts in the French set', async () => {
    const database = await createTestDatabase()
    await insertSealedProducts(database)

    const { candidates, unavailableSources } = await searchSealedSetCandidates(database, 'sv08.5', '', prismaticSetNames)

    expect(candidates.map(candidate => candidate.label)).toEqual([
      'Prismatic Evolutions Elite Trainer Box',
      'Prismatic Evolutions Booster',
      'Prismatic Evolutions Booster Bundle',
    ])
    expect(candidates[0]).toMatchObject({
      origin: 'cardmarket',
      productId: null,
      draft: { category: 'pokemon-sealed', productType: 'ETB', seriesName: 'Évolutions Prismatiques', cardmarketProductId: 2 },
    })
    expect(unavailableSources).toEqual([])
  })

  it('filters the set by the typed words, French kind names included', async () => {
    const database = await createTestDatabase()
    await insertSealedProducts(database)

    const { candidates } = await searchSealedSetCandidates(database, 'sv08.5', 'coffret', prismaticSetNames)

    expect(candidates.map(candidate => candidate.label)).toEqual(['Prismatic Evolutions Booster Bundle'])
  })

  it('shows a product already in the catalogue first, once, with its sealed kind', async () => {
    const database = await createTestDatabase()
    const userId = await insertUser(database)
    await insertSealedProducts(database)
    await createProduct(database, userId, {
      ...emptyProductDraft('ETB Évolutions Prismatiques', 'pokemon-sealed'),
      cardmarketProductId: 2,
    })

    const { candidates } = await searchSealedSetCandidates(database, 'sv08.5', '', prismaticSetNames)

    expect(candidates.map(candidate => [candidate.origin, candidate.label])).toEqual([
      ['catalogue', 'ETB Évolutions Prismatiques'],
      ['cardmarket', 'Prismatic Evolutions Booster'],
      ['cardmarket', 'Prismatic Evolutions Booster Bundle'],
    ])
    expect(candidates[0]!.draft.productType).toBe('ETB')
  })

  it('returns nothing for a set without sealed products', async () => {
    const database = await createTestDatabase()
    await insertSealedProducts(database)

    expect(await searchSealedSetCandidates(database, 'sv07', '', prismaticSetNames)).toEqual({ candidates: [], unavailableSources: [] })
  })

  it('reports TCGdex as unavailable when the set names cannot be read', async () => {
    const database = await createTestDatabase()
    await insertSealedProducts(database)

    const outcome = await searchSealedSetCandidates(database, 'sv08.5', '', {
      listCardSetNames: async () => {
        throw new SourceBlockedError('tcgdex', 'blocked')
      },
    })

    expect(outcome).toEqual({ candidates: [], unavailableSources: ['tcgdex'] })
  })
})
