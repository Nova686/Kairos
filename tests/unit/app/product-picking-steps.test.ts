import { describe, expect, it } from 'vitest'
import {
  buildCatalogueSearchQuery,
  describeCandidateSubtitle,
  describeSearchFieldLabel,
  keepSealedProductKind,
  listSealedProductKinds,
  productCategoryTiles,
  resolveProductPickingStep,
  type ProductPickingChoices,
} from '../../../app/utils/product-picking-steps.ts'
import type { ProductCandidate } from '../../../shared/catalogue/product-candidate.ts'
import type { ProductCategory } from '../../../shared/catalogue/product-category.ts'
import { emptyProductDraft } from '../../../shared/catalogue/product-draft.ts'

const choices = (overrides: Partial<ProductPickingChoices>): ProductPickingChoices => ({
  productCategory: null,
  cardSetId: null,
  isCardSetSkipped: false,
  ...overrides,
})

const candidate = (label: string, productCategory: ProductCategory, productType: string | null): ProductCandidate => ({
  origin: 'cardmarket',
  label,
  imageUrl: null,
  productId: null,
  draft: { ...emptyProductDraft(label, productCategory), productType },
})

describe('resolveProductPickingStep', () => {
  it('asks for the product type first', () => {
    expect(resolveProductPickingStep(choices({}))).toBe('category')
  })

  it('asks for the set of sealed products and graded cards before the article', () => {
    expect(resolveProductPickingStep(choices({ productCategory: 'pokemon-sealed' }))).toBe('card-set')
    expect(resolveProductPickingStep(choices({ productCategory: 'graded-card' }))).toBe('card-set')
  })

  it('goes to the article once a set is chosen or skipped', () => {
    expect(resolveProductPickingStep(choices({ productCategory: 'pokemon-sealed', cardSetId: 'sv08.5' }))).toBe('article')
    expect(resolveProductPickingStep(choices({ productCategory: 'graded-card', isCardSetSkipped: true }))).toBe('article')
  })

  it('goes straight to the article for toys, makeup and other products', () => {
    expect(resolveProductPickingStep(choices({ productCategory: 'toy' }))).toBe('article')
    expect(resolveProductPickingStep(choices({ productCategory: 'makeup' }))).toBe('article')
    expect(resolveProductPickingStep(choices({ productCategory: 'other' }))).toBe('article')
  })
})

describe('buildCatalogueSearchQuery', () => {
  it('searches nothing before the article step', () => {
    expect(buildCatalogueSearchQuery(choices({}), 'pikachu')).toBeNull()
    expect(buildCatalogueSearchQuery(choices({ productCategory: 'pokemon-sealed' }), 'pikachu')).toBeNull()
  })

  it('lists a whole set even without typed text', () => {
    expect(buildCatalogueSearchQuery(choices({ productCategory: 'pokemon-sealed', cardSetId: 'sv08.5' }), '  ')).toEqual({
      category: 'pokemon-sealed',
      set: 'sv08.5',
      q: '',
    })
  })

  it('needs typed text without a set, and keeps the category', () => {
    expect(buildCatalogueSearchQuery(choices({ productCategory: 'toy' }), ' ')).toBeNull()
    expect(buildCatalogueSearchQuery(choices({ productCategory: 'toy' }), ' peluche ')).toEqual({ category: 'toy', q: 'peluche' })
  })
})

describe('listSealedProductKinds', () => {
  it('lists each kind once, in shop order', () => {
    const kinds = listSealedProductKinds([
      candidate('Booster', 'pokemon-sealed', 'Booster'),
      candidate('ETB', 'pokemon-sealed', 'ETB'),
      candidate('Booster 2', 'pokemon-sealed', 'Booster'),
      candidate('Sans type', 'pokemon-sealed', null),
    ])

    expect(kinds).toEqual(['ETB', 'Booster'])
  })
})

describe('keepSealedProductKind', () => {
  const candidates = [candidate('Booster', 'pokemon-sealed', 'Booster'), candidate('ETB', 'pokemon-sealed', 'ETB')]

  it('keeps only the chosen kind', () => {
    expect(keepSealedProductKind(candidates, 'ETB').map(kept => kept.label)).toEqual(['ETB'])
  })

  it('keeps everything when no kind is chosen', () => {
    expect(keepSealedProductKind(candidates, null)).toEqual(candidates)
  })
})

describe('describeCandidateSubtitle', () => {
  it('tells a pending barcode will be linked', () => {
    expect(describeCandidateSubtitle(candidate('ETB', 'pokemon-sealed', 'ETB'), '3196204420218')).toBe('Lier ce code-barres à ce produit')
  })

  it('shows the sealed kind, or the category when there is none', () => {
    expect(describeCandidateSubtitle(candidate('ETB', 'pokemon-sealed', 'ETB'), null)).toBe('ETB')
    expect(describeCandidateSubtitle(candidate('Pikachu', 'graded-card', null), null)).toBe('Carte gradée')
  })
})

describe('describeSearchFieldLabel', () => {
  it('names a free search without a set, and a filter inside a set', () => {
    expect(describeSearchFieldLabel(choices({ productCategory: 'toy' }))).toBe('Rechercher un produit')
    expect(describeSearchFieldLabel(choices({ productCategory: 'pokemon-sealed', cardSetId: 'sv08.5' }))).toBe('Filtrer les produits de l’extension')
    expect(describeSearchFieldLabel(choices({ productCategory: 'graded-card', cardSetId: 'sv08.5' }))).toBe('Filtrer par nom ou numéro')
  })
})

describe('productCategoryTiles', () => {
  it('offers one tile per product category', () => {
    expect(productCategoryTiles.map(tile => tile.category)).toEqual(['pokemon-sealed', 'graded-card', 'toy', 'makeup', 'other'])
  })
})
