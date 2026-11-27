import { inArray } from 'drizzle-orm'
import type { KairosDatabase } from '../../database/open-database.ts'
import { cardmarketProducts, products } from '../../database/schema/index.ts'
import type { SealedSetOption } from '../../../shared/catalogue/card-set-option.ts'
import type { ProductCandidate } from '../../../shared/catalogue/product-candidate.ts'
import { sealedProductKindOf, sealedProductKindRank } from '../../../shared/catalogue/sealed-product-kind.ts'
import { foldAccentsAndCase } from '../../../shared/text/fold-accents-and-case.ts'
import type { CardmarketCatalogueProduct } from '../../../src/price-sources/cardmarket/search-cardmarket-catalogue.ts'
import { readTcgdexSetNamesDaily } from '../../../src/price-sources/tcgdex/read-tcgdex-set-names-daily.ts'
import type { CardSetNames } from '../../../src/price-sources/tcgdex/tcgdex-adapter.ts'
import { attributeSealedProductsToCardSets } from './attribute-sealed-products-to-card-sets.ts'
import {
  settleSource,
  splitIntoSearchableWords,
  toCardmarketCandidate,
  toCatalogueCandidate,
  type ProductSearchOutcome,
} from './search-product-candidates.ts'
import { translateFrenchProductQuery } from './translate-french-product-query.ts'

export interface SealedSetSearchDependencies {
  listCardSetNames: () => Promise<CardSetNames[]>
}

const defaultDependencies: SealedSetSearchDependencies = {
  listCardSetNames: () => readTcgdexSetNamesDaily(),
}

const compareSealedProducts = (firstProduct: CardmarketCatalogueProduct, secondProduct: CardmarketCatalogueProduct): number =>
  sealedProductKindRank(sealedProductKindOf(firstProduct.categoryName)) - sealedProductKindRank(sealedProductKindOf(secondProduct.categoryName))
  || firstProduct.name.length - secondProduct.name.length
  || firstProduct.name.localeCompare(secondProduct.name)

const matchesAnyQueryVariant = (sealedProduct: CardmarketCatalogueProduct, queryVariantWords: string[][]): boolean => {
  const searchableText = foldAccentsAndCase(`${sealedProduct.name} ${sealedProductKindOf(sealedProduct.categoryName)}`)
  return queryVariantWords.some(variantWords => variantWords.every(queryWord => searchableText.includes(queryWord)))
}

const withSealedProductKind = (candidate: ProductCandidate, sealedProduct: CardmarketCatalogueProduct): ProductCandidate => ({
  ...candidate,
  draft: { ...candidate.draft, productType: candidate.draft.productType ?? sealedProductKindOf(sealedProduct.categoryName) },
})

export const listSealedCardSets = async (
  database: KairosDatabase,
  dependencies: SealedSetSearchDependencies = defaultDependencies,
): Promise<SealedSetOption[]> => {
  const [cardSetNames, sealedProducts] = await Promise.all([
    dependencies.listCardSetNames(),
    database.select().from(cardmarketProducts),
  ])
  const sealedProductsByCardSet = attributeSealedProductsToCardSets(cardSetNames, sealedProducts)
  return cardSetNames.flatMap((cardSet) => {
    const sealedProductCount = sealedProductsByCardSet.get(cardSet.id)?.length ?? 0
    return sealedProductCount > 0 ? [{ id: cardSet.id, name: cardSet.frenchName, sealedProductCount }] : []
  })
}

export const searchSealedSetCandidates = async (
  database: KairosDatabase,
  setId: string,
  query: string,
  dependencies: SealedSetSearchDependencies = defaultDependencies,
): Promise<ProductSearchOutcome> => {
  const unavailableSources: string[] = []
  const [cardSetNames, sealedProducts] = await Promise.all([
    settleSource('tcgdex', () => dependencies.listCardSetNames(), unavailableSources),
    database.select().from(cardmarketProducts),
  ])
  const cardSet = cardSetNames.find(namedCardSet => namedCardSet.id === setId)
  const queryVariantWords = [...new Set([query, translateFrenchProductQuery(query, cardSetNames)])].map(splitIntoSearchableWords)
  const matchingSealedProducts = (attributeSealedProductsToCardSets(cardSetNames, sealedProducts).get(setId) ?? [])
    .filter(sealedProduct => matchesAnyQueryVariant(sealedProduct, queryVariantWords))
    .sort(compareSealedProducts)
  if (matchingSealedProducts.length === 0) {
    return { candidates: [], unavailableSources }
  }

  const linkedCatalogueProducts = await database
    .select()
    .from(products)
    .where(inArray(products.cardmarketProductId, matchingSealedProducts.map(sealedProduct => sealedProduct.idProduct)))
  const catalogueCandidates = matchingSealedProducts.flatMap(sealedProduct =>
    linkedCatalogueProducts
      .filter(product => product.cardmarketProductId === sealedProduct.idProduct)
      .map(product => withSealedProductKind(toCatalogueCandidate(product), sealedProduct)),
  )
  const knownCardmarketIds = new Set(linkedCatalogueProducts.map(product => product.cardmarketProductId))
  const cardmarketCandidates = matchingSealedProducts
    .filter(sealedProduct => !knownCardmarketIds.has(sealedProduct.idProduct))
    .map(sealedProduct => toCardmarketCandidate(sealedProduct, cardSet?.frenchName ?? null))

  return { candidates: [...catalogueCandidates, ...cardmarketCandidates], unavailableSources }
}
