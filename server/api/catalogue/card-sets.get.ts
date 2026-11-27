import { listTcgdexCardSets } from '../../../src/price-sources/tcgdex/tcgdex-adapter'
import { listSealedCardSets } from '../../domain/catalogue/search-sealed-set-candidates'

const cardSetsCacheSeconds = 24 * 60 * 60

const listCachedCardSets = defineCachedFunction(() => listTcgdexCardSets(), {
  name: 'tcgdex-card-sets',
  getKey: () => 'fr',
  maxAge: cardSetsCacheSeconds,
  validate: cachedEntry => Array.isArray(cachedEntry.value) && cachedEntry.value.length > 0,
})

export default defineEventHandler(async (event) => {
  await requireSessionUser(event)
  if (getQuery(event).category === 'pokemon-sealed') {
    return listSealedCardSets(await useDatabase())
  }
  return listCachedCardSets()
})
