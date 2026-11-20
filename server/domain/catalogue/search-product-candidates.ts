import { inArray, or } from 'drizzle-orm'
import type { KairosDatabase } from '../../database/open-database.ts'
import { cardmarketProducts, products } from '../../database/schema/index.ts'
import { emptyProductDraft, type ProductDraft } from '../../../shared/catalogue/product-draft.ts'
import { isProductCategory } from '../../../shared/catalogue/product-category.ts'
import { searchCardmarketCatalogue } from '../../../src/price-sources/cardmarket/search-cardmarket-catalogue.ts'
import type { CardCandidate } from '../../../src/price-sources/card-candidate.ts'
import { SourceBlockedError, SourceDisabledError } from '../../../src/price-sources/price-source-types.ts'
import { readTcgdexSetNamesDaily } from '../../../src/price-sources/tcgdex/read-tcgdex-set-names-daily.ts'
import { searchTcgdexCards, type CardSetNames } from '../../../src/price-sources/tcgdex/tcgdex-adapter.ts'
import type { Product } from './catalogue-service.ts'
import type { ProductCandidate } from '../../../shared/catalogue/product-candidate.ts'
import { foldAccentsAndCase } from '../../../shared/text/fold-accents-and-case.ts'
import { translateFrenchProductQuery } from './translate-french-product-query.ts'

export type { ProductCandidate }

export interface ProductSearchDependencies {
  searchTcgdexCards: (frenchName: string) => Promise<CardCandidate[]>
  listCardSetNames: () => Promise<CardSetNames[]>
}

export interface ProductSearchOutcome {
  candidates: ProductCandidate[]
  unavailableSources: string[]
}

const maximumCandidatesPerOrigin = 10

const defaultDependencies: ProductSearchDependencies = {
  searchTcgdexCards: frenchName => searchTcgdexCards(frenchName),
  listCardSetNames: () => readTcgdexSetNamesDaily(),
}

export const splitIntoSearchableWords = (query: string): string[] =>
  foldAccentsAndCase(query).split(/\s+/).filter(queryWord => queryWord.length > 0)

const toDraft = (product: Product): ProductDraft => ({
  name: product.name,
  category: isProductCategory(product.category) ? product.category : 'other',
  productType: product.productType,
  seriesName: product.seriesName,
  language: product.language,
  imageUrl: product.imageUrl,
  cardmarketProductId: product.cardmarketProductId,
  tcgdexCardId: product.tcgdexCardId,
  ebayQuery: product.ebayQuery,
  ebayExcludedKeywords: product.ebayExcludedKeywords,
})

export const toCatalogueCandidate = (product: Product): ProductCandidate => ({
  origin: 'catalogue',
  label: product.name,
  imageUrl: product.imageUrl,
  productId: product.id,
  draft: toDraft(product),
})

export const toTcgdexCandidate = (tcgdexCard: CardCandidate, label: string): ProductCandidate => ({
  origin: 'tcgdex',
  label,
  imageUrl: tcgdexCard.imageUrl,
  productId: null,
  draft: {
    ...emptyProductDraft(tcgdexCard.name, 'graded-card'),
    seriesName: tcgdexCard.setName,
    imageUrl: tcgdexCard.imageUrl,
    tcgdexCardId: tcgdexCard.sourceCardId,
  },
})

export const settleSource = async <TOutcome>(
  sourceName: string,
  search: () => Promise<TOutcome[]>,
  unavailableSources: string[],
): Promise<TOutcome[]> => {
  try {
    return await search()
  } catch (failure) {
    if (failure instanceof SourceDisabledError || failure instanceof SourceBlockedError) {
      unavailableSources.push(sourceName)
      return []
    }
    throw failure
  }
}

export const searchProductCandidates = async (
  database: KairosDatabase,
  query: string,
  dependencies: ProductSearchDependencies = defaultDependencies,
): Promise<ProductSearchOutcome> => {
  const trimmedQuery = query.trim()
  const queryWords = splitIntoSearchableWords(trimmedQuery)
  if (queryWords.length === 0) {
    return { candidates: [], unavailableSources: [] }
  }

  const unavailableSources: string[] = []
  const [tcgdexCards, cardSetNames, allCardmarketProducts] = await Promise.all([
    settleSource('tcgdex', () => dependencies.searchTcgdexCards(trimmedQuery), unavailableSources),
    settleSource('tcgdex', () => dependencies.listCardSetNames(), unavailableSources),
    database.select().from(cardmarketProducts),
  ])

  const queryVariants = [...new Set([trimmedQuery, translateFrenchProductQuery(trimmedQuery, cardSetNames)])]
  const queryVariantWords = queryVariants.map(splitIntoSearchableWords).filter(variantWords => variantWords.length > 0)
  const matchingCardmarketProducts = queryVariants
    .flatMap(queryVariant => searchCardmarketCatalogue(allCardmarketProducts, queryVariant, allCardmarketProducts.length))
    .filter((cardmarketProduct, position, matchedProducts) =>
      matchedProducts.findIndex(otherProduct => otherProduct.idProduct === cardmarketProduct.idProduct) === position)
    .sort((firstProduct, secondProduct) => firstProduct.name.length - secondProduct.name.length)
  const externalCardmarketIds = matchingCardmarketProducts.map(cardmarketProduct => cardmarketProduct.idProduct)
  const externalTcgdexIds = tcgdexCards.map(tcgdexCard => tcgdexCard.sourceCardId)

  const catalogueProducts = await database.select().from(products)
  const linkedProductCondition = or(
    externalCardmarketIds.length > 0 ? inArray(products.cardmarketProductId, externalCardmarketIds) : undefined,
    externalTcgdexIds.length > 0 ? inArray(products.tcgdexCardId, externalTcgdexIds) : undefined,
  )
  const linkedCatalogueProducts = linkedProductCondition
    ? await database.select().from(products).where(linkedProductCondition)
    : []
  const nameMatchingProducts = catalogueProducts.filter((product) => {
    const searchableName = foldAccentsAndCase(product.name)
    return queryVariantWords.some(variantWords => variantWords.every(queryWord => searchableName.includes(queryWord)))
  })
  const catalogueProductsToShow = [...nameMatchingProducts, ...linkedCatalogueProducts].filter(
    (product, position, shownProducts) =>
      shownProducts.findIndex(otherProduct => otherProduct.id === product.id) === position,
  )

  const knownCardmarketIds = new Set(catalogueProducts.map(product => product.cardmarketProductId))
  const knownTcgdexIds = new Set(catalogueProducts.map(product => product.tcgdexCardId))

  const cardmarketCandidates: ProductCandidate[] = matchingCardmarketProducts
    .filter(cardmarketProduct => !knownCardmarketIds.has(cardmarketProduct.idProduct))
    .slice(0, maximumCandidatesPerOrigin)
    .map(cardmarketProduct => ({
      origin: 'cardmarket',
      label: cardmarketProduct.name,
      imageUrl: null,
      productId: null,
      draft: { ...emptyProductDraft(cardmarketProduct.name, 'pokemon-sealed'), cardmarketProductId: cardmarketProduct.idProduct },
    }))

  const tcgdexCandidates: ProductCandidate[] = tcgdexCards
    .filter(tcgdexCard => !knownTcgdexIds.has(tcgdexCard.sourceCardId))
    .slice(0, maximumCandidatesPerOrigin)
    .map(tcgdexCard => toTcgdexCandidate(tcgdexCard, tcgdexCard.setName ? `${tcgdexCard.name} (${tcgdexCard.setName})` : tcgdexCard.name))

  return {
    candidates: [
      ...catalogueProductsToShow.slice(0, maximumCandidatesPerOrigin).map(toCatalogueCandidate),
      ...cardmarketCandidates,
      ...tcgdexCandidates,
    ],
    unavailableSources: [...new Set(unavailableSources)].sort(),
  }
}
