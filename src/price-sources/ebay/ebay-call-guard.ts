import { SourceBlockedError, SourceDisabledError } from '../price-source-types.ts'
import type { ListingObservation } from '../price-source-types.ts'

export interface EbayCallGuardLimits {
  searchCacheLifetimeMs: number
  maximumCachedSearches: number
  pauseAfterRefusalMs: number
  searchBudgetPerDay: number
}

export const ebayCallGuardLimits: EbayCallGuardLimits = {
  searchCacheLifetimeMs: 10 * 60_000,
  maximumCachedSearches: 200,
  pauseAfterRefusalMs: 60 * 60_000,
  searchBudgetPerDay: 4000,
}

const dayLengthMs = 24 * 60 * 60_000

type CachedSearch = { listings: Promise<ListingObservation[]>; expiresAt: number }

export interface EbayCallGuard {
  guardSearch: (searchKey: string, searchOnEbay: () => Promise<ListingObservation[]>) => Promise<ListingObservation[]>
  forgetHistory: () => void
}

export interface EbayCallGuardOptions {
  limits?: EbayCallGuardLimits
  readClock?: () => number
  onRefusal?: () => void
}

export const createEbayCallGuard = ({
  limits = ebayCallGuardLimits,
  readClock = Date.now,
  onRefusal = () => {},
}: EbayCallGuardOptions = {}): EbayCallGuard => {
  const cachedSearches = new Map<string, CachedSearch>()
  let searchStartTimes: number[] = []
  let pause: { until: number; reason: string } | null = null

  const dropExpiredSearches = (currentTime: number): void => {
    for (const [searchKey, cachedSearch] of cachedSearches) {
      if (cachedSearch.expiresAt <= currentTime) {
        cachedSearches.delete(searchKey)
      }
    }
  }

  const rememberSearch = (searchKey: string, cachedSearch: CachedSearch): void => {
    cachedSearches.set(searchKey, cachedSearch)
    const oldestSearchKey = cachedSearches.keys().next().value
    if (cachedSearches.size > limits.maximumCachedSearches && oldestSearchKey !== undefined) {
      cachedSearches.delete(oldestSearchKey)
    }
  }

  const ensureEbayMayBeCalled = (currentTime: number): void => {
    if (pause && pause.until > currentTime) {
      throw new SourceBlockedError('ebay', pause.reason)
    }
    pause = null
    searchStartTimes = searchStartTimes.filter(searchStartTime => searchStartTime > currentTime - dayLengthMs)
    if (searchStartTimes.length >= limits.searchBudgetPerDay) {
      throw new SourceBlockedError('ebay', 'daily-budget')
    }
  }

  const settleSearch = async (
    searchKey: string,
    searchStartTime: number,
    searchOnEbay: () => Promise<ListingObservation[]>,
  ): Promise<ListingObservation[]> => {
    try {
      return await searchOnEbay()
    }
    catch (failure) {
      cachedSearches.delete(searchKey)
      if (failure instanceof SourceDisabledError) {
        searchStartTimes = searchStartTimes.filter(recordedStartTime => recordedStartTime !== searchStartTime)
      }
      if (failure instanceof SourceBlockedError) {
        pause = { until: readClock() + limits.pauseAfterRefusalMs, reason: failure.reason }
        onRefusal()
      }
      throw failure
    }
  }

  const guardSearch = async (searchKey: string, searchOnEbay: () => Promise<ListingObservation[]>): Promise<ListingObservation[]> => {
    const currentTime = readClock()
    dropExpiredSearches(currentTime)
    const cachedSearch = cachedSearches.get(searchKey)
    if (cachedSearch) {
      return cachedSearch.listings
    }
    ensureEbayMayBeCalled(currentTime)
    searchStartTimes.push(currentTime)
    const listings = settleSearch(searchKey, currentTime, searchOnEbay)
    rememberSearch(searchKey, { listings, expiresAt: currentTime + limits.searchCacheLifetimeMs })
    return listings
  }

  const forgetHistory = (): void => {
    cachedSearches.clear()
    searchStartTimes = []
    pause = null
  }

  return { guardSearch, forgetHistory }
}
