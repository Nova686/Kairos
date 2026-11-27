import { describe, expect, it } from 'vitest'
import { sealedProductKindOf, sealedProductKindRank, sealedProductKinds } from '../../../shared/catalogue/sealed-product-kind.ts'

describe('sealedProductKindOf', () => {
  it('names a Cardmarket category with the word used in French shops', () => {
    expect(sealedProductKindOf('Pokémon Elite Trainer Boxes')).toBe('ETB')
    expect(sealedProductKindOf('Pokémon Tins')).toBe('Pokébox')
    expect(sealedProductKindOf('Pokémon Box Set')).toBe('Coffret')
  })

  it('falls back to Autre for a category it does not know', () => {
    expect(sealedProductKindOf('Pokémon PCG Set')).toBe('Autre')
  })
})

describe('sealedProductKindRank', () => {
  it('orders kinds as listed and puts unknown or missing kinds last', () => {
    expect(sealedProductKindRank('ETB')).toBeLessThan(sealedProductKindRank('Booster'))
    expect(sealedProductKindRank('Inconnu')).toBe(sealedProductKinds.length)
    expect(sealedProductKindRank(null)).toBe(sealedProductKinds.length)
  })
})
