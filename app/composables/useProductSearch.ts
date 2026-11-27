import type { ProductCandidate } from '~~/shared/catalogue/product-candidate'
import type { ProductCategory } from '~~/shared/catalogue/product-category'
import type { ProductPickingChoices } from '~/utils/product-picking-steps'

export interface CandidateGroup {
  origin: ProductCandidate['origin']
  title: string
  candidates: ProductCandidate[]
}

const searchDebounceMilliseconds = 400

const originTitles: Record<ProductCandidate['origin'], string> = {
  catalogue: 'Dans votre catalogue',
  cardmarket: 'Cardmarket',
  tcgdex: 'TCGdex',
  identification: 'Code-barres',
}

const unavailableSourceMessages: Record<string, string> = {
  tcgdex: 'TCGdex indisponible',
}

const describeUnavailableSource = (sourceName: string): string =>
  unavailableSourceMessages[sourceName] ?? `${sourceName} indisponible`

export const useProductSearch = () => {
  const productCategory = ref<ProductCategory | null>(null)
  const cardSetId = ref<string | null>(null)
  const isCardSetSkipped = ref(false)
  const searchText = ref('')
  const sealedProductKind = ref<string | null>(null)
  const candidates = ref<ProductCandidate[]>([])
  const unavailableSources = ref<string[]>([])
  const isSearching = ref(false)
  const searchErrorMessage = ref('')
  const hasSearchOutcome = ref(false)
  let latestSearchNumber = 0
  let pendingSearch: ReturnType<typeof setTimeout> | undefined

  const pickingChoices = computed<ProductPickingChoices>(() => ({
    productCategory: productCategory.value,
    cardSetId: cardSetId.value,
    isCardSetSkipped: isCardSetSkipped.value,
  }))

  const pickingStep = computed(() => resolveProductPickingStep(pickingChoices.value))

  const chosenCategoryTile = computed(() => productCategoryTiles.find(tile => tile.category === productCategory.value) ?? null)

  const searchFieldLabel = computed(() => describeSearchFieldLabel(pickingChoices.value))

  const sealedProductKindOptions = computed(() =>
    productCategory.value === 'pokemon-sealed' ? listSealedProductKinds(candidates.value) : [],
  )

  const candidateGroups = computed<CandidateGroup[]>(() => {
    const shownCandidates = keepSealedProductKind(candidates.value, sealedProductKind.value)
    return (Object.keys(originTitles) as ProductCandidate['origin'][])
      .map(origin => ({
        origin,
        title: originTitles[origin],
        candidates: shownCandidates.filter(candidate => candidate.origin === origin),
      }))
      .filter(group => group.candidates.length > 0)
  })

  const unavailableMessages = computed(() => unavailableSources.value.map(describeUnavailableSource))

  const hasNoResult = computed(() => hasSearchOutcome.value && !isSearching.value && candidateGroups.value.length === 0)

  const runSearch = async () => {
    latestSearchNumber += 1
    const searchNumber = latestSearchNumber
    searchErrorMessage.value = ''
    const searchQuery = buildCatalogueSearchQuery(pickingChoices.value, searchText.value)
    if (searchQuery === null) {
      candidates.value = []
      unavailableSources.value = []
      hasSearchOutcome.value = false
      isSearching.value = false
      return
    }
    isSearching.value = true
    try {
      const outcome = await $fetch<{ candidates: ProductCandidate[], unavailableSources: string[] }>(
        '/api/catalogue/search',
        { query: searchQuery },
      )
      if (searchNumber === latestSearchNumber) {
        candidates.value = outcome.candidates
        unavailableSources.value = outcome.unavailableSources
        hasSearchOutcome.value = true
      }
    }
    catch {
      if (searchNumber === latestSearchNumber) {
        searchErrorMessage.value = 'La recherche a échoué. Réessayez.'
      }
    }
    finally {
      if (searchNumber === latestSearchNumber) {
        isSearching.value = false
      }
    }
  }

  const resetArticleStep = () => {
    searchText.value = ''
    sealedProductKind.value = null
    candidates.value = []
    unavailableSources.value = []
    hasSearchOutcome.value = false
  }

  const chooseCategory = (chosenCategory: ProductCategory) => {
    productCategory.value = chosenCategory
    cardSetId.value = null
    isCardSetSkipped.value = false
    resetArticleStep()
  }

  const reopenCategoryStep = () => {
    productCategory.value = null
    cardSetId.value = null
    isCardSetSkipped.value = false
    resetArticleStep()
  }

  const chooseCardSet = (chosenCardSetId: string) => {
    cardSetId.value = chosenCardSetId
    isCardSetSkipped.value = false
    resetArticleStep()
  }

  const skipCardSet = () => {
    cardSetId.value = null
    isCardSetSkipped.value = true
    resetArticleStep()
  }

  const reopenCardSetStep = () => {
    cardSetId.value = null
    isCardSetSkipped.value = false
    resetArticleStep()
  }

  watch(searchText, () => {
    clearTimeout(pendingSearch)
    pendingSearch = setTimeout(runSearch, searchDebounceMilliseconds)
  })

  watch(pickingChoices, () => {
    clearTimeout(pendingSearch)
    runSearch()
  })

  onScopeDispose(() => clearTimeout(pendingSearch))

  return {
    productCategory,
    cardSetId,
    isCardSetSkipped,
    pickingStep,
    chosenCategoryTile,
    searchText,
    sealedProductKind,
    sealedProductKindOptions,
    searchFieldLabel,
    candidateGroups,
    unavailableMessages,
    hasNoResult,
    isSearching,
    searchErrorMessage,
    chooseCategory,
    reopenCategoryStep,
    chooseCardSet,
    skipCardSet,
    reopenCardSetStep,
    runSearch,
  }
}
