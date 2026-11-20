import { listTcgdexSetNames, type CardSetNames } from './tcgdex-adapter.ts'

const setNamesLifetimeMs = 24 * 60 * 60_000

type CachedSetNames = { setNames: Promise<CardSetNames[]>; expiresAt: number }

export interface DailySetNamesReaderOptions {
  listSetNames?: () => Promise<CardSetNames[]>
  readClock?: () => number
}

export const createDailySetNamesReader = ({
  listSetNames = () => listTcgdexSetNames(),
  readClock = Date.now,
}: DailySetNamesReaderOptions = {}): (() => Promise<CardSetNames[]>) => {
  let cachedSetNames: CachedSetNames | null = null

  const forgetUnlessReplaced = (settledEntry: CachedSetNames): void => {
    if (cachedSetNames === settledEntry) {
      cachedSetNames = null
    }
  }

  return () => {
    const currentTime = readClock()
    if (cachedSetNames && cachedSetNames.expiresAt > currentTime) {
      return cachedSetNames.setNames
    }
    const freshEntry: CachedSetNames = { setNames: listSetNames(), expiresAt: currentTime + setNamesLifetimeMs }
    cachedSetNames = freshEntry
    freshEntry.setNames.then(
      (setNames) => {
        if (setNames.length === 0) {
          forgetUnlessReplaced(freshEntry)
        }
      },
      () => forgetUnlessReplaced(freshEntry),
    )
    return freshEntry.setNames
  }
}

export const readTcgdexSetNamesDaily = createDailySetNamesReader()
