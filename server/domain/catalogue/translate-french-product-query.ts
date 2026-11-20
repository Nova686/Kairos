import type { CardSetNames } from '../../../src/price-sources/tcgdex/tcgdex-adapter.ts'
import { foldAccentsAndCase } from '../../../shared/text/fold-accents-and-case.ts'

const frenchSealedProductTerms: { frenchTerm: string; englishTerm: string }[] = [
  { frenchTerm: 'coffret dresseur d’élite', englishTerm: 'elite trainer box' },
  { frenchTerm: 'coffret dresseur élite', englishTerm: 'elite trainer box' },
  { frenchTerm: 'etb', englishTerm: 'elite trainer box' },
  { frenchTerm: 'upc', englishTerm: 'ultra premium collection' },
  { frenchTerm: 'display', englishTerm: 'booster box' },
  { frenchTerm: 'tripack', englishTerm: '3 pack' },
]

const frenchSetCodePrefixes: Record<string, string> = { ev: 'sv', eb: 'swsh', sl: 'sm', nb: 'bw' }

const setCodePattern = /^([a-z]+)0*(\d+(?:\.\d+)?[a-z]?)$/

interface PhraseTranslation {
  frenchWords: string[]
  englishWords: string[]
}

export const toQueryWords = (text: string): string[] =>
  foldAccentsAndCase(text)
    .replace(/[^\p{L}\p{N}.&]+/gu, ' ')
    .split(' ')
    .map(queryWord => queryWord.replace(/^\.+|\.+$/g, ''))
    .filter(queryWord => queryWord.length > 0)

const toSetCodeKey = (setCode: string): string | null => {
  const setCodeMatch = setCodePattern.exec(setCode)
  if (!setCodeMatch) {
    return null
  }
  const [, seriesPrefix = '', setNumber = ''] = setCodeMatch
  return `${frenchSetCodePrefixes[seriesPrefix] ?? seriesPrefix}${setNumber}`
}

const startsWithPhrase = (queryWords: string[], position: number, phraseWords: string[]): boolean =>
  phraseWords.every((phraseWord, offset) => queryWords[position + offset] === phraseWord)

export const translateFrenchProductQuery = (query: string, cardSetNames: CardSetNames[]): string => {
  const englishSetWordsByCode = new Map<string, string[]>()
  for (const cardSet of cardSetNames) {
    const setCodeKey = toSetCodeKey(cardSet.id)
    if (setCodeKey) {
      englishSetWordsByCode.set(setCodeKey, toQueryWords(cardSet.englishName))
    }
  }
  const phraseTranslations: PhraseTranslation[] = [
    ...frenchSealedProductTerms.map(({ frenchTerm, englishTerm }) => ({
      frenchWords: toQueryWords(frenchTerm),
      englishWords: toQueryWords(englishTerm),
    })),
    ...cardSetNames.map(cardSet => ({
      frenchWords: toQueryWords(cardSet.frenchName),
      englishWords: toQueryWords(cardSet.englishName),
    })),
  ]
    .filter(phraseTranslation => phraseTranslation.frenchWords.length > 0)
    .sort((firstPhrase, secondPhrase) => secondPhrase.frenchWords.length - firstPhrase.frenchWords.length)

  const queryWords = toQueryWords(query)
  const translatedWords: string[] = []
  let position = 0
  while (position < queryWords.length) {
    const matchingPhrase = phraseTranslations.find(phraseTranslation =>
      startsWithPhrase(queryWords, position, phraseTranslation.frenchWords))
    if (matchingPhrase) {
      translatedWords.push(...matchingPhrase.englishWords)
      position += matchingPhrase.frenchWords.length
      continue
    }
    const queryWord = queryWords[position] ?? ''
    const setCodeKey = toSetCodeKey(queryWord)
    translatedWords.push(...((setCodeKey && englishSetWordsByCode.get(setCodeKey)) || [queryWord]))
    position += 1
  }
  return translatedWords.join(' ')
}
