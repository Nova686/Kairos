import { inArray } from 'drizzle-orm'
import type { KairosDatabase } from '../../database/open-database.ts'
import { products } from '../../database/schema/index.ts'
import type { CardSetCard } from '../../../src/price-sources/card-candidate.ts'
import { listTcgdexSetCards } from '../../../src/price-sources/tcgdex/tcgdex-adapter.ts'
import { foldAccentsAndCase } from '../../../shared/text/fold-accents-and-case.ts'
import {
  settleSource,
  splitIntoSearchableWords,
  toCatalogueCandidate,
  toTcgdexCandidate,
  type ProductSearchOutcome,
} from './search-product-candidates.ts'

export interface CardSetSearchDependencies {
  listTcgdexSetCards: (setId: string) => Promise<CardSetCard[]>
}

const defaultDependencies: CardSetSearchDependencies = {
  listTcgdexSetCards: setId => listTcgdexSetCards(setId),
}

const containsEveryWord = (setCard: CardSetCard, queryWords: string[]): boolean => {
  const searchableText = foldAccentsAndCase(`${setCard.name} ${setCard.cardNumber}`)
  return queryWords.every(queryWord => searchableText.includes(queryWord))
}

export const searchCardSetCandidates = async (
  database: KairosDatabase,
  setId: string,
  query: string,
  dependencies: CardSetSearchDependencies = defaultDependencies,
): Promise<ProductSearchOutcome> => {
  const unavailableSources: string[] = []
  const setCards = await settleSource('tcgdex', () => dependencies.listTcgdexSetCards(setId), unavailableSources)
  const queryWords = splitIntoSearchableWords(query)
  const matchingSetCards = setCards.filter(setCard => containsEveryWord(setCard, queryWords))
  if (matchingSetCards.length === 0) {
    return { candidates: [], unavailableSources }
  }

  const linkedCatalogueProducts = await database
    .select()
    .from(products)
    .where(inArray(products.tcgdexCardId, matchingSetCards.map(setCard => setCard.sourceCardId)))
  const catalogueCandidates = matchingSetCards.flatMap(setCard =>
    linkedCatalogueProducts
      .filter(product => product.tcgdexCardId === setCard.sourceCardId)
      .map(toCatalogueCandidate),
  )
  const knownTcgdexIds = new Set(linkedCatalogueProducts.map(product => product.tcgdexCardId))
  const tcgdexCandidates = matchingSetCards
    .filter(setCard => !knownTcgdexIds.has(setCard.sourceCardId))
    .map(setCard => toTcgdexCandidate(setCard, `${setCard.cardNumber} · ${setCard.name}`))

  return { candidates: [...catalogueCandidates, ...tcgdexCandidates], unavailableSources }
}
