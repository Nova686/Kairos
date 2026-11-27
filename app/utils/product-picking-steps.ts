import type { ProductCandidate } from '../../shared/catalogue/product-candidate.ts'
import { productCategories, productCategoryLabels, type ProductCategory } from '../../shared/catalogue/product-category.ts'
import { sealedProductKindRank } from '~~/shared/catalogue/sealed-product-kind.ts'
import { describeProductThumbnail } from './product-thumbnail-view.ts'

export type ProductPickingStep = 'category' | 'card-set' | 'article'

export interface ProductPickingChoices {
  productCategory: ProductCategory | null
  cardSetId: string | null
  isCardSetSkipped: boolean
}

export const categoryUsesCardSets = (productCategory: ProductCategory): boolean =>
  productCategory === 'pokemon-sealed' || productCategory === 'graded-card'

export const resolveProductPickingStep = ({
  productCategory,
  cardSetId,
  isCardSetSkipped,
}: ProductPickingChoices): ProductPickingStep => {
  if (productCategory === null) {
    return 'category'
  }
  if (categoryUsesCardSets(productCategory) && cardSetId === null && !isCardSetSkipped) {
    return 'card-set'
  }
  return 'article'
}

export const buildCatalogueSearchQuery = (
  choices: ProductPickingChoices,
  searchText: string,
): Record<string, string> | null => {
  if (choices.productCategory === null || resolveProductPickingStep(choices) !== 'article') {
    return null
  }
  const trimmedText = searchText.trim()
  if (choices.cardSetId !== null) {
    return { category: choices.productCategory, set: choices.cardSetId, q: trimmedText }
  }
  return trimmedText === '' ? null : { category: choices.productCategory, q: trimmedText }
}

export const listSealedProductKinds = (candidates: ProductCandidate[]): string[] =>
  [...new Set(candidates.flatMap(candidate => (candidate.draft.productType ? [candidate.draft.productType] : [])))]
    .sort((firstKind, secondKind) => sealedProductKindRank(firstKind) - sealedProductKindRank(secondKind))

export const keepSealedProductKind = (candidates: ProductCandidate[], sealedProductKind: string | null): ProductCandidate[] =>
  sealedProductKind ? candidates.filter(candidate => candidate.draft.productType === sealedProductKind) : candidates

export const describeCandidateSubtitle = (candidate: ProductCandidate, pendingBarcode: string | null): string =>
  pendingBarcode ? 'Lier ce code-barres à ce produit' : candidate.draft.productType ?? productCategoryLabels[candidate.draft.category]

export interface ProductCategoryTile {
  category: ProductCategory
  label: string
  glyph: string
}

export const productCategoryTiles: ProductCategoryTile[] = productCategories.map(category => ({
  category,
  label: productCategoryLabels[category],
  glyph: describeProductThumbnail(category, null).glyph,
}))

export const describeSearchFieldLabel = (choices: ProductPickingChoices): string => {
  if (choices.cardSetId === null) {
    return 'Rechercher un produit'
  }
  return choices.productCategory === 'pokemon-sealed' ? 'Filtrer les produits de l’extension' : 'Filtrer par nom ou numéro'
}
