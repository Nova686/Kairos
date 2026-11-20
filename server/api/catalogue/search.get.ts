import { searchCardSetCandidates } from '../../domain/catalogue/search-card-set-candidates'
import { searchProductCandidates } from '../../domain/catalogue/search-product-candidates'

export default defineEventHandler(async (event) => {
  await requireSessionUser(event)
  const { q: searchQuery, set: cardSetId } = getQuery(event)
  const query = typeof searchQuery === 'string' ? searchQuery : ''
  const database = await useDatabase()
  if (typeof cardSetId === 'string' && cardSetId.trim() !== '') {
    return searchCardSetCandidates(database, cardSetId.trim(), query)
  }
  return searchProductCandidates(database, query)
})
