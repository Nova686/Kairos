import { listTcgdexCardSets } from '../../../src/price-sources/tcgdex/tcgdex-adapter'

const cardSetsCacheSeconds = 24 * 60 * 60

const listCachedCardSets = defineCachedFunction(() => listTcgdexCardSets(), {
  name: 'tcgdex-card-sets',
  getKey: () => 'fr',
  maxAge: cardSetsCacheSeconds,
  validate: cachedEntry => Array.isArray(cachedEntry.value) && cachedEntry.value.length > 0,
})

export default defineEventHandler(async (event) => {
  await requireSessionUser(event)
  return listCachedCardSets()
})
