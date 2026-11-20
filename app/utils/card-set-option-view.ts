import type { CardSetOption } from '../../shared/catalogue/card-set-option.ts'
import { foldAccentsAndCase } from '~~/shared/text/fold-accents-and-case.ts'
import { pluralizeFrench } from './pluralize-french.ts'

export const matchesCardSetName = (cardSetName: string, typedText: string): boolean =>
  foldAccentsAndCase(cardSetName).includes(foldAccentsAndCase(typedText.trim()))

export const describeCardSetOption = (cardSetOption: CardSetOption): { subtitle: string } => ({
  subtitle: pluralizeFrench(cardSetOption.cardCount, 'carte'),
})
