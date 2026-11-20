import { createEbayCallGuard } from '../../../src/price-sources/ebay/ebay-call-guard.ts'
import type { EbayCallGuardLimits } from '../../../src/price-sources/ebay/ebay-call-guard.ts'
import { SourceBlockedError, SourceDisabledError } from '../../../src/price-sources/price-source-types.ts'
import type { ListingObservation } from '../../../src/price-sources/price-source-types.ts'

const minuteMs = 60_000

const testLimits: EbayCallGuardLimits = {
  searchCacheLifetimeMs: 10 * minuteMs,
  maximumCachedSearches: 2,
  pauseAfterRefusalMs: 60 * minuteMs,
  searchBudgetPerDay: 10,
}

const listingTitled = (title: string): ListingObservation => ({
  source: 'ebay',
  kind: 'active',
  title,
  priceCents: 1000,
  shippingCents: null,
  sourceCondition: null,
  url: `https://www.ebay.fr/itm/${title}`,
  imageUrl: null,
})

const createTestGuard = (limits: Partial<EbayCallGuardLimits> = {}) => {
  let currentTime = 0
  const refusals: string[] = []
  const guard = createEbayCallGuard({
    limits: { ...testLimits, ...limits },
    readClock: () => currentTime,
    onRefusal: () => refusals.push('refused'),
  })
  const searchedKeys: string[] = []
  const searchOnce = (searchKey: string) =>
    guard.guardSearch(searchKey, async () => {
      searchedKeys.push(searchKey)
      return [listingTitled(searchKey)]
    })
  return {
    guard,
    searchOnce,
    searchedKeys,
    refusals,
    advanceMinutes: (minutes: number) => {
      currentTime += minutes * minuteMs
    },
  }
}

describe('createEbayCallGuard', () => {
  it('answers the same search from memory for ten minutes, then asks eBay again', async () => {
    const { searchOnce, searchedKeys, advanceMinutes } = createTestGuard()

    expect(await searchOnce('etb')).toEqual([listingTitled('etb')])
    advanceMinutes(9)
    expect(await searchOnce('etb')).toEqual([listingTitled('etb')])
    expect(searchedKeys).toEqual(['etb'])

    advanceMinutes(1)
    await searchOnce('etb')
    expect(searchedKeys).toEqual(['etb', 'etb'])
  })

  it('shares one eBay call between simultaneous identical searches', async () => {
    const { searchOnce, searchedKeys } = createTestGuard()

    await Promise.all([searchOnce('display'), searchOnce('display')])

    expect(searchedKeys).toEqual(['display'])
  })

  it('forgets the oldest search beyond the cache size', async () => {
    const { searchOnce, searchedKeys } = createTestGuard()

    await searchOnce('first')
    await searchOnce('second')
    await searchOnce('third')
    await searchOnce('second')
    await searchOnce('first')

    expect(searchedKeys).toEqual(['first', 'second', 'third', 'first'])
  })

  it('stops calling eBay once the budget of the last 24 hours is spent, until the oldest call is a day old', async () => {
    const { searchOnce, searchedKeys, advanceMinutes } = createTestGuard({ searchBudgetPerDay: 3 })

    await searchOnce('a')
    advanceMinutes(60)
    await searchOnce('b')
    await searchOnce('c')
    await expect(searchOnce('d')).rejects.toEqual(new SourceBlockedError('ebay', 'daily-budget'))

    advanceMinutes(23 * 60)
    expect(await searchOnce('d')).toEqual([listingTitled('d')])
    expect(searchedKeys).toEqual(['a', 'b', 'c', 'd'])
  })

  it('pauses eBay for an hour after a refusal and forgets the access token', async () => {
    const { guard, searchOnce, searchedKeys, refusals, advanceMinutes } = createTestGuard()
    let refusedCalls = 0
    const refusedSearch = () => guard.guardSearch('refused', async () => {
      refusedCalls += 1
      throw new SourceBlockedError('ebay', 'http-429')
    })

    await expect(refusedSearch()).rejects.toBeInstanceOf(SourceBlockedError)
    advanceMinutes(59)
    await expect(searchOnce('other')).rejects.toEqual(new SourceBlockedError('ebay', 'http-429'))
    await expect(refusedSearch()).rejects.toBeInstanceOf(SourceBlockedError)
    expect(refusedCalls).toBe(1)
    expect(refusals).toEqual(['refused'])

    advanceMinutes(1)
    expect(await searchOnce('other')).toEqual([listingTitled('other')])
    expect(searchedKeys).toEqual(['other'])
  })

  it('neither caches a failed search nor counts a search made without keys', async () => {
    const { guard, searchOnce } = createTestGuard({ searchBudgetPerDay: 3 })
    const searchWithoutKeys = () => guard.guardSearch('no-keys', async () => {
      throw new SourceDisabledError('ebay', 'EBAY_CLIENT_ID')
    })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(searchWithoutKeys()).rejects.toBeInstanceOf(SourceDisabledError)
    }

    await searchOnce('a')
    await searchOnce('b')
    expect(await searchOnce('c')).toEqual([listingTitled('c')])
  })
})
