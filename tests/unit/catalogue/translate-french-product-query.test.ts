import { translateFrenchProductQuery } from '../../../server/domain/catalogue/translate-french-product-query.ts'
import type { CardSetNames } from '../../../src/price-sources/tcgdex/tcgdex-adapter.ts'

const cardSetNames: CardSetNames[] = [
  { id: 'sv10', frenchName: 'Rivalités Destinées', englishName: 'Destined Rivals' },
  { id: 'sv03.5', frenchName: '151', englishName: '151' },
  { id: 'swsh12', frenchName: 'Tempête Argentée', englishName: 'Silver Tempest' },
  { id: 'me01', frenchName: 'Méga-Évolution', englishName: 'Mega Evolution' },
]

describe('translateFrenchProductQuery', () => {
  it('turns a French abbreviation and a French set code into the English Cardmarket naming', () => {
    expect(translateFrenchProductQuery('etb ev10', cardSetNames)).toBe('elite trainer box destined rivals')
    expect(translateFrenchProductQuery('ETB EV10', cardSetNames)).toBe('elite trainer box destined rivals')
  })

  it('turns a French set name into its English name', () => {
    expect(translateFrenchProductQuery('etb rivalités destinées', cardSetNames)).toBe('elite trainer box destined rivals')
    expect(translateFrenchProductQuery('Coffret Dresseur d’Élite Tempête Argentée', cardSetNames))
      .toBe('elite trainer box silver tempest')
  })

  it('reads set codes with or without their leading zero and half sets', () => {
    expect(translateFrenchProductQuery('display ev3.5', cardSetNames)).toBe('booster box 151')
    expect(translateFrenchProductQuery('upc eb12', cardSetNames)).toBe('ultra premium collection silver tempest')
    expect(translateFrenchProductQuery('tripack me1', cardSetNames)).toBe('3 pack mega evolution')
  })

  it('keeps the words it does not know', () => {
    expect(translateFrenchProductQuery('etb ev99 dracaufeu', cardSetNames)).toBe('elite trainer box ev99 dracaufeu')
    expect(translateFrenchProductQuery('etb ev10', [])).toBe('elite trainer box ev10')
  })
})
