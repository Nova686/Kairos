import type { CardmarketCatalogueProduct } from '../../../src/price-sources/cardmarket/search-cardmarket-catalogue.ts'
import type { CardSetNames } from '../../../src/price-sources/tcgdex/tcgdex-adapter.ts'
import { toQueryWords } from './translate-french-product-query.ts'

interface EnglishCardSetName {
  cardSetId: string
  wordSequence: string
}

const toWordSequence = (text: string): string => ` ${toQueryWords(text).join(' ')} `

const groupByExpansion = <TProduct extends CardmarketCatalogueProduct>(sealedProducts: TProduct[]): TProduct[][] => {
  const productsByExpansion = new Map<number, TProduct[]>()
  for (const sealedProduct of sealedProducts) {
    const expansionProducts = productsByExpansion.get(sealedProduct.idExpansion)
    if (expansionProducts) {
      expansionProducts.push(sealedProduct)
    } else {
      productsByExpansion.set(sealedProduct.idExpansion, [sealedProduct])
    }
  }
  return [...productsByExpansion.values()]
}

const findDominantCardSetId = (expansionProducts: CardmarketCatalogueProduct[], englishCardSetNames: EnglishCardSetName[]): string | null => {
  const namingProductCounts = new Map<string, number>()
  for (const expansionProduct of expansionProducts) {
    const productWords = toWordSequence(expansionProduct.name)
    const namedCardSet = englishCardSetNames.find(englishCardSetName => productWords.includes(englishCardSetName.wordSequence))
    if (namedCardSet) {
      namingProductCounts.set(namedCardSet.cardSetId, (namingProductCounts.get(namedCardSet.cardSetId) ?? 0) + 1)
    }
  }
  const [dominantCardSetId, namingProductCount] = [...namingProductCounts.entries()]
    .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])[0] ?? [null, 0]
  return namingProductCount * 2 > expansionProducts.length ? dominantCardSetId : null
}

export const attributeSealedProductsToCardSets = <TProduct extends CardmarketCatalogueProduct>(
  cardSetNames: CardSetNames[],
  sealedProducts: TProduct[],
): Map<string, TProduct[]> => {
  const englishCardSetNames = cardSetNames
    .map(cardSet => ({ cardSetId: cardSet.id, wordSequence: toWordSequence(cardSet.englishName) }))
    .filter(englishCardSetName => englishCardSetName.wordSequence.trim() !== '')
    .sort((firstName, secondName) => secondName.wordSequence.length - firstName.wordSequence.length)
  const sealedProductsByCardSet = new Map<string, TProduct[]>()
  for (const expansionProducts of groupByExpansion(sealedProducts)) {
    const dominantCardSetId = findDominantCardSetId(expansionProducts, englishCardSetNames)
    if (dominantCardSetId !== null) {
      sealedProductsByCardSet.set(dominantCardSetId, [...(sealedProductsByCardSet.get(dominantCardSetId) ?? []), ...expansionProducts])
    }
  }
  return sealedProductsByCardSet
}
