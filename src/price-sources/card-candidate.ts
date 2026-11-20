export interface CardCandidate {
  source: 'tcgdex'
  sourceCardId: string
  name: string
  setName: string | null
  imageUrl: string | null
}

export interface CardSetCard extends CardCandidate {
  cardNumber: string
}
