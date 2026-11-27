import { isProductCategory } from '../../../shared/catalogue/product-category'
import { searchCardSetCandidates } from '../../domain/catalogue/search-card-set-candidates'
import { liveProductSearchDependencies, searchProductCandidates } from '../../domain/catalogue/search-product-candidates'
import { searchSealedSetCandidates } from '../../domain/catalogue/search-sealed-set-candidates'

export default defineEventHandler(async (event) => {
  await requireSessionUser(event)
  const { q: searchQuery, set: cardSetId, category: requestedCategory } = getQuery(event)
  const query = typeof searchQuery === 'string' ? searchQuery : ''
  const productCategory = typeof requestedCategory === 'string' && isProductCategory(requestedCategory) ? requestedCategory : null
  const database = await useDatabase()
  if (typeof cardSetId === 'string' && cardSetId.trim() !== '') {
    return productCategory === 'pokemon-sealed'
      ? searchSealedSetCandidates(database, cardSetId.trim(), query)
      : searchCardSetCandidates(database, cardSetId.trim(), query)
  }
  return searchProductCandidates(database, query, liveProductSearchDependencies, productCategory)
})
