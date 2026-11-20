import { describe, expect, it } from 'vitest'
import { describeCardSetOption, matchesCardSetName } from '../../../app/utils/card-set-option-view.ts'

describe('matchesCardSetName', () => {
  it('finds a set from part of its name, ignoring accents and case', () => {
    expect(matchesCardSetName('Évolutions Prismatiques', ' evolutions ')).toBe(true)
    expect(matchesCardSetName('Évolutions Prismatiques', 'PRISMA')).toBe(true)
  })

  it('rejects a set whose name does not hold the typed text', () => {
    expect(matchesCardSetName('Évolutions Prismatiques', 'flammes')).toBe(false)
  })
})

describe('describeCardSetOption', () => {
  it('shows how many cards the set holds', () => {
    expect(describeCardSetOption({ id: 'sv08.5', name: 'Évolutions Prismatiques', cardCount: 180 })).toEqual({
      subtitle: '180 cartes',
    })
  })
})
