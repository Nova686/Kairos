export const sealedProductKinds = [
  'ETB',
  'Display',
  'Booster',
  'Coffret',
  'Pokébox',
  'Blister',
  'Deck',
  'Kit du dresseur',
  'Pièce',
  'Lot',
  'Autre',
] as const

export type SealedProductKind = (typeof sealedProductKinds)[number]

const sealedProductKindsByCardmarketCategory: Record<string, SealedProductKind> = {
  'Pokémon Elite Trainer Boxes': 'ETB',
  'Pokémon Display': 'Display',
  'Pokémon Booster': 'Booster',
  'Pokémon Box Set': 'Coffret',
  'Pokémon Tins': 'Pokébox',
  'Pokémon Blisters': 'Blister',
  'Pokémon Theme Decks': 'Deck',
  'Pokémon Trainer Kits': 'Kit du dresseur',
  'Pokémon Coins': 'Pièce',
  'Pokémon Lot': 'Lot',
}

export const sealedProductKindOf = (cardmarketCategoryName: string): SealedProductKind =>
  sealedProductKindsByCardmarketCategory[cardmarketCategoryName] ?? 'Autre'

export const sealedProductKindRank = (productType: string | null): number => {
  const kindPosition = sealedProductKinds.findIndex(sealedProductKind => sealedProductKind === productType)
  return kindPosition === -1 ? sealedProductKinds.length : kindPosition
}
