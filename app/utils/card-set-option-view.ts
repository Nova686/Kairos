import type { CardSetOption, SealedSetOption } from '../../shared/catalogue/card-set-option.ts'
import { foldAccentsAndCase } from '~~/shared/text/fold-accents-and-case.ts'
import { pluralizeFrench } from './pluralize-french.ts'

export interface CardSetChoice {
  id: string
  name: string
  subtitle: string
}

export const matchesCardSetName = (cardSetName: string, typedText: string): boolean =>
  foldAccentsAndCase(cardSetName).includes(foldAccentsAndCase(typedText.trim()))

export const toCardSetChoice = (cardSetOption: CardSetOption): CardSetChoice => ({
  id: cardSetOption.id,
  name: cardSetOption.name,
  subtitle: pluralizeFrench(cardSetOption.cardCount, 'carte'),
})

export const toSealedSetChoice = (sealedSetOption: SealedSetOption): CardSetChoice => ({
  id: sealedSetOption.id,
  name: sealedSetOption.name,
  subtitle: pluralizeFrench(sealedSetOption.sealedProductCount, 'produit scellé', 'produits scellés'),
})
