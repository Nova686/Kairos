import { describe, expect, it } from 'vitest'
import { attributeSealedProductsToCardSets } from '../../../server/domain/catalogue/attribute-sealed-products-to-card-sets.ts'
import type { CardmarketCatalogueProduct } from '../../../src/price-sources/cardmarket/search-cardmarket-catalogue.ts'
import type { CardSetNames } from '../../../src/price-sources/tcgdex/tcgdex-adapter.ts'

const cardSetNames: CardSetNames[] = [
  { id: 'sv08.5', frenchName: 'Évolutions Prismatiques', englishName: 'Prismatic Evolutions' },
  { id: 'sv08', frenchName: 'Étincelles Déferlantes', englishName: 'Surging Sparks' },
  { id: 'xy12', frenchName: 'Évolutions', englishName: 'Evolutions' },
  { id: 'base1', frenchName: 'Set de Base', englishName: 'Base' },
]

const sealedProduct = (idProduct: number, name: string, idExpansion: number): CardmarketCatalogueProduct => ({
  idProduct,
  name,
  categoryName: 'Pokémon Booster',
  idExpansion,
})

const attributedNames = (attribution: Map<string, CardmarketCatalogueProduct[]>, cardSetId: string): string[] =>
  (attribution.get(cardSetId) ?? []).map(product => product.name)

describe('attributeSealedProductsToCardSets', () => {
  it('gives a whole Cardmarket expansion to the set most of its products name, unnamed products included', () => {
    const attribution = attributeSealedProductsToCardSets(cardSetNames, [
      sealedProduct(1, 'Prismatic Evolutions Elite Trainer Box', 10),
      sealedProduct(2, 'Prismatic Evolutions Booster Bundle', 10),
      sealedProduct(3, 'Eevee Pin Collection', 10),
    ])

    expect(attributedNames(attribution, 'sv08.5')).toEqual([
      'Prismatic Evolutions Elite Trainer Box',
      'Prismatic Evolutions Booster Bundle',
      'Eevee Pin Collection',
    ])
  })

  it('prefers the longest set name a product holds, so Prismatic Evolutions never lands in Evolutions', () => {
    const attribution = attributeSealedProductsToCardSets(cardSetNames, [
      sealedProduct(1, 'Prismatic Evolutions Booster', 10),
      sealedProduct(2, 'Evolutions Booster', 20),
    ])

    expect(attributedNames(attribution, 'sv08.5')).toEqual(['Prismatic Evolutions Booster'])
    expect(attributedNames(attribution, 'xy12')).toEqual(['Evolutions Booster'])
  })

  it('matches set names on whole words only', () => {
    const attribution = attributeSealedProductsToCardSets(cardSetNames, [sealedProduct(1, 'Database Collection', 30)])

    expect(attribution.has('base1')).toBe(false)
  })

  it('leaves out an expansion where no set is named by more than half the products', () => {
    const attribution = attributeSealedProductsToCardSets(cardSetNames, [
      sealedProduct(1, 'Surging Sparks Booster', 40),
      sealedProduct(2, 'Pikachu Tin', 40),
    ])

    expect(attribution.size).toBe(0)
  })
})
