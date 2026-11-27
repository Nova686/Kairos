import { describe, expect, it } from 'vitest'
import { matchesCardSetName, toCardSetChoice, toSealedSetChoice } from '../../../app/utils/card-set-option-view.ts'

describe('matchesCardSetName', () => {
  it('finds a set from part of its name, ignoring accents and case', () => {
    expect(matchesCardSetName('Évolutions Prismatiques', ' evolutions ')).toBe(true)
    expect(matchesCardSetName('Évolutions Prismatiques', 'PRISMA')).toBe(true)
  })

  it('rejects a set whose name does not hold the typed text', () => {
    expect(matchesCardSetName('Évolutions Prismatiques', 'flammes')).toBe(false)
  })
})

describe('toCardSetChoice', () => {
  it('shows how many cards the set holds', () => {
    expect(toCardSetChoice({ id: 'sv08.5', name: 'Évolutions Prismatiques', cardCount: 180 })).toEqual({
      id: 'sv08.5',
      name: 'Évolutions Prismatiques',
      subtitle: '180 cartes',
    })
  })
})

describe('toSealedSetChoice', () => {
  it('shows how many sealed products the set holds', () => {
    expect(toSealedSetChoice({ id: 'sv08.5', name: 'Évolutions Prismatiques', sealedProductCount: 1 }).subtitle).toBe('1 produit scellé')
    expect(toSealedSetChoice({ id: 'sv08.5', name: 'Évolutions Prismatiques', sealedProductCount: 12 }).subtitle).toBe('12 produits scellés')
  })
})
