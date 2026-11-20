import { createDailySetNamesReader } from '../../src/price-sources/tcgdex/read-tcgdex-set-names-daily.ts'
import type { CardSetNames } from '../../src/price-sources/tcgdex/tcgdex-adapter.ts'

const destinedRivals: CardSetNames = { id: 'sv10', frenchName: 'Rivalités Destinées', englishName: 'Destined Rivals' }
const dayMilliseconds = 24 * 60 * 60_000

const countingSetNamesSource = (answers: (() => Promise<CardSetNames[]>)[]) => {
  let callCount = 0
  const listSetNames = () => {
    const answer = answers[Math.min(callCount, answers.length - 1)] ?? (async () => [])
    callCount += 1
    return answer()
  }
  return { listSetNames, readCallCount: () => callCount }
}

describe('createDailySetNamesReader', () => {
  it('asks TCGdex once a day for the set names', async () => {
    let currentTime = Date.UTC(2026, 10, 20, 9)
    const { listSetNames, readCallCount } = countingSetNamesSource([async () => [destinedRivals]])
    const readSetNames = createDailySetNamesReader({ listSetNames, readClock: () => currentTime })

    expect(await readSetNames()).toEqual([destinedRivals])
    currentTime += dayMilliseconds - 1
    expect(await readSetNames()).toEqual([destinedRivals])
    expect(readCallCount()).toBe(1)

    currentTime += 1
    await readSetNames()
    expect(readCallCount()).toBe(2)
  })

  it('shares one request between searches typed at the same moment', async () => {
    const { listSetNames, readCallCount } = countingSetNamesSource([async () => [destinedRivals]])
    const readSetNames = createDailySetNamesReader({ listSetNames, readClock: () => 0 })

    await Promise.all([readSetNames(), readSetNames()])

    expect(readCallCount()).toBe(1)
  })

  it('asks again after a failure or an empty answer instead of keeping it for a day', async () => {
    const { listSetNames, readCallCount } = countingSetNamesSource([
      async () => { throw new Error('TCGdex down') },
      async () => [],
      async () => [destinedRivals],
    ])
    const readSetNames = createDailySetNamesReader({ listSetNames, readClock: () => 0 })

    await expect(readSetNames()).rejects.toThrow('TCGdex down')
    expect(await readSetNames()).toEqual([])
    expect(await readSetNames()).toEqual([destinedRivals])
    expect(await readSetNames()).toEqual([destinedRivals])
    expect(readCallCount()).toBe(3)
  })
})
