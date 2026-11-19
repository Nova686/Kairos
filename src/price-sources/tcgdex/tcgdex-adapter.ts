import { requestSourceJson } from '../../source-http/request-source-json.ts'
import type { FetchFunction } from '../../source-http/request-source-json.ts'
import type { CardCandidate, CardSetCard } from '../card-candidate.ts'
import type { CardSetOption } from '../../../shared/catalogue/card-set-option.ts'
import { euroFigureToCents } from '../price-source-types.ts'
import type { SourceAggregate } from '../price-source-types.ts'

const tcgdexFrenchCardsEndpoint = 'https://api.tcgdex.net/v2/fr/cards'
const tcgdexFrenchSetsEndpoint = 'https://api.tcgdex.net/v2/fr/sets'
const pocketSerieId = 'tcgp'

interface TcgdexCardBrief {
  id: string
  name: string
  image?: string
}

interface TcgdexSetCardBrief extends TcgdexCardBrief {
  localId: string
}

interface TcgdexCardCount {
  total: number
  official: number
}

interface TcgdexSetBrief {
  id: string
  name: string
  cardCount: TcgdexCardCount
}

interface TcgdexSet extends TcgdexSetBrief {
  cards: TcgdexSetCardBrief[]
}

interface TcgdexCardmarketPricing {
  updated: string
  unit: string
  idProduct: number
  avg: number | null
  low: number | null
  trend: number | null
  avg7: number | null
  avg30: number | null
}

interface TcgdexCard extends TcgdexCardBrief {
  set?: { name?: string }
  pricing?: { cardmarket?: TcgdexCardmarketPricing | null }
}

const tcgdexImageUrl = (imageBase: string | undefined): string | null =>
  imageBase ? `${imageBase}/high.webp` : null

export const searchTcgdexCards = async (frenchName: string, fetchFunction?: FetchFunction): Promise<CardCandidate[]> => {
  const searchUrl = `${tcgdexFrenchCardsEndpoint}?${new URLSearchParams({ name: frenchName }).toString()}`
  const cardBriefs = await requestSourceJson<TcgdexCardBrief[]>('tcgdex', searchUrl, {}, fetchFunction)
  return (cardBriefs ?? []).map((cardBrief) => ({
    source: 'tcgdex',
    sourceCardId: cardBrief.id,
    name: cardBrief.name,
    setName: null,
    imageUrl: tcgdexImageUrl(cardBrief.image),
  }))
}

export const listTcgdexCardSets = async (fetchFunction?: FetchFunction): Promise<CardSetOption[]> => {
  const listingParameters = new URLSearchParams({
    'serie.id': `neq:${pocketSerieId}`,
    'sort:field': 'releaseDate',
    'sort:order': 'DESC',
  })
  const setBriefs = await requestSourceJson<TcgdexSetBrief[]>(
    'tcgdex',
    `${tcgdexFrenchSetsEndpoint}?${listingParameters.toString()}`,
    {},
    fetchFunction,
  )
  return (setBriefs ?? []).map(setBrief => ({ id: setBrief.id, name: setBrief.name, cardCount: setBrief.cardCount.total }))
}

export const listTcgdexSetCards = async (setId: string, fetchFunction?: FetchFunction): Promise<CardSetCard[]> => {
  const cardSet = await requestSourceJson<TcgdexSet>(
    'tcgdex',
    `${tcgdexFrenchSetsEndpoint}/${encodeURIComponent(setId)}`,
    {},
    fetchFunction,
  )
  if (!cardSet) {
    return []
  }
  return cardSet.cards.map(setCard => ({
    source: 'tcgdex',
    sourceCardId: setCard.id,
    name: setCard.name,
    setName: cardSet.name,
    imageUrl: tcgdexImageUrl(setCard.image),
    cardNumber: `${setCard.localId}/${cardSet.cardCount.official}`,
  }))
}

export const fetchTcgdexCardAggregate = async (
  cardId: string,
  fetchFunction?: FetchFunction,
): Promise<SourceAggregate | null> => {
  const card = await requestSourceJson<TcgdexCard>('tcgdex', `${tcgdexFrenchCardsEndpoint}/${encodeURIComponent(cardId)}`, {}, fetchFunction)
  const cardmarketPricing = card?.pricing?.cardmarket
  if (!cardmarketPricing || cardmarketPricing.unit !== 'EUR') {
    return null
  }
  return {
    source: 'tcgdex',
    sourceProductId: String(cardmarketPricing.idProduct),
    averageCents: euroFigureToCents(cardmarketPricing.avg),
    lowCents: euroFigureToCents(cardmarketPricing.low),
    trendCents: euroFigureToCents(cardmarketPricing.trend),
    average7DaysCents: euroFigureToCents(cardmarketPricing.avg7),
    average30DaysCents: euroFigureToCents(cardmarketPricing.avg30),
    observedAt: cardmarketPricing.updated,
  }
}
