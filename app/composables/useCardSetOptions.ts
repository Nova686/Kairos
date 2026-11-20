import type { CardSetOption } from '~~/shared/catalogue/card-set-option'

export const useCardSetOptions = () => {
  const { data: cardSetOptions, status, error } = useFetch<CardSetOption[]>('/api/catalogue/card-sets', {
    server: false,
    lazy: true,
    default: () => [],
  })

  const isLoadingCardSets = computed(() => status.value === 'pending')
  const cardSetsErrorMessage = computed(() => (error.value ? 'Extensions indisponibles' : ''))

  return { cardSetOptions, isLoadingCardSets, cardSetsErrorMessage }
}
