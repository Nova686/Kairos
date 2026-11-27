import type { Ref } from 'vue'
import type { CardSetOption, SealedSetOption } from '~~/shared/catalogue/card-set-option'
import type { ProductCategory } from '~~/shared/catalogue/product-category'
import type { CardSetChoice } from '~/utils/card-set-option-view'

const fetchCardSetChoices = async (productCategory: ProductCategory): Promise<CardSetChoice[]> => {
  if (productCategory === 'pokemon-sealed') {
    const sealedSetOptions = await $fetch<SealedSetOption[]>('/api/catalogue/card-sets', { query: { category: productCategory } })
    return sealedSetOptions.map(toSealedSetChoice)
  }
  const cardSetOptions = await $fetch<CardSetOption[]>('/api/catalogue/card-sets')
  return cardSetOptions.map(toCardSetChoice)
}

export const useCardSetOptions = (productCategory: Ref<ProductCategory | null>, cardSetId: Ref<string | null>) => {
  const cardSetChoicesByCategory = ref<Partial<Record<ProductCategory, CardSetChoice[]>>>({})
  const loadingCategory = ref<ProductCategory | null>(null)
  const cardSetsErrorMessage = ref('')
  const cardSetFilterText = ref('')

  const cardSetChoices = computed(() =>
    productCategory.value === null ? [] : cardSetChoicesByCategory.value[productCategory.value] ?? [],
  )

  const filteredCardSetChoices = computed(() =>
    cardSetChoices.value.filter(cardSetChoice => matchesCardSetName(cardSetChoice.name, cardSetFilterText.value)),
  )

  const isLoadingCardSets = computed(() => loadingCategory.value !== null && loadingCategory.value === productCategory.value)

  const chosenCardSetLabel = computed(() =>
    cardSetChoices.value.find(cardSetChoice => cardSetChoice.id === cardSetId.value)?.name ?? 'Sans extension',
  )

  const loadCardSetChoices = async (chosenCategory: ProductCategory | null) => {
    cardSetFilterText.value = ''
    cardSetsErrorMessage.value = ''
    if (chosenCategory === null || !categoryUsesCardSets(chosenCategory) || cardSetChoicesByCategory.value[chosenCategory]) {
      return
    }
    loadingCategory.value = chosenCategory
    try {
      const loadedChoices = await fetchCardSetChoices(chosenCategory)
      cardSetChoicesByCategory.value = { ...cardSetChoicesByCategory.value, [chosenCategory]: loadedChoices }
    }
    catch {
      if (productCategory.value === chosenCategory) {
        cardSetsErrorMessage.value = 'Extensions indisponibles'
      }
    }
    finally {
      if (loadingCategory.value === chosenCategory) {
        loadingCategory.value = null
      }
    }
  }

  watch(productCategory, loadCardSetChoices)

  return {
    cardSetFilterText,
    filteredCardSetChoices,
    isLoadingCardSets,
    cardSetsErrorMessage,
    chosenCardSetLabel,
  }
}
