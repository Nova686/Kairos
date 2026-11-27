<template>
  <div class="product-candidate-picker">
    <div v-if="identifiedCandidates.length > 0">
      <div class="kairos-label product-candidate-picker__group">
        Résultats du scan
      </div>
      <CandidateList
        :candidates="identifiedCandidates"
        :pending-barcode="pendingBarcode"
        is-scan-result
        @picked="pickCandidate"
      />
    </div>
    <ProductCategoryStep
      v-if="pickingStep === 'category' || chosenCategoryTile === null"
      @chosen="chooseCategory"
    />
    <template v-else>
      <PickingStepSummary
        label="Type"
        :value="chosenCategoryTile.label"
        :icon="chosenCategoryTile.glyph"
        @change="reopenCategoryStep"
      />
      <CardSetStep
        v-if="pickingStep === 'card-set'"
        v-model:filter-text="cardSetFilterText"
        :choices="filteredCardSetChoices"
        :is-loading="isLoadingCardSets"
        :error-message="cardSetsErrorMessage"
        @chosen="chooseCardSet"
        @skipped="skipCardSet"
      />
      <template v-else>
        <PickingStepSummary
          v-if="categoryUsesCardSets(chosenCategoryTile.category)"
          label="Extension"
          :value="chosenCardSetLabel"
          icon="mdi-cards-outline"
          @change="reopenCardSetStep"
        />
        <v-text-field
          v-model="searchText"
          :label="searchFieldLabel"
          :autofocus="cardSetId === null"
          prepend-inner-icon="mdi-magnify"
          :loading="isSearching"
          clearable
          hide-details
        />
        <v-chip-group
          v-if="sealedProductKindOptions.length > 1"
          v-model="sealedProductKind"
          selected-class="text-primary"
          aria-label="Type de produit scellé"
          filter
        >
          <v-chip
            v-for="sealedProductKindOption in sealedProductKindOptions"
            :key="sealedProductKindOption"
            :value="sealedProductKindOption"
          >
            {{ sealedProductKindOption }}
          </v-chip>
        </v-chip-group>
        <v-alert
          v-if="searchErrorMessage"
          type="error"
          role="alert"
        >
          {{ searchErrorMessage }}
        </v-alert>
        <p
          v-for="unavailableMessage in unavailableMessages"
          :key="unavailableMessage"
          class="text-medium-emphasis"
        >
          {{ unavailableMessage }}
        </p>
        <p
          v-if="hasNoResult"
          class="text-medium-emphasis"
          role="status"
        >
          Aucun article trouvé : créez-le ci-dessous.
        </p>
        <div
          v-for="candidateGroup in candidateGroups"
          :key="candidateGroup.origin"
        >
          <div class="kairos-label product-candidate-picker__group">
            {{ candidateGroup.title }}
          </div>
          <CandidateList
            :candidates="candidateGroup.candidates"
            :pending-barcode="pendingBarcode"
            @picked="pickCandidate"
          />
        </div>
        <v-alert
          v-if="errorMessage"
          type="error"
          role="alert"
        >
          {{ errorMessage }}
        </v-alert>
        <v-form
          class="product-candidate-picker__creation"
          @submit.prevent="createBlankProduct"
        >
          <v-text-field
            v-model="newProductName"
            :label="`Nouveau produit · ${chosenCategoryTile.label}`"
            hide-details
          />
          <v-btn
            type="submit"
            color="primary"
            height="56"
            :loading="isCreating"
          >
            Créer
          </v-btn>
        </v-form>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ProductCandidate } from '~~/shared/catalogue/product-candidate'
import type { ProductReference } from '~~/shared/catalogue/product-reference'
import type { BlankProductContext } from '~/composables/useProductPicking'

withDefaults(defineProps<{
  identifiedCandidates?: ProductCandidate[]
  pendingBarcode?: string | null
}>(), { identifiedCandidates: () => [], pendingBarcode: null })

const emit = defineEmits<{ picked: [product: ProductReference] }>()

const {
  productCategory,
  cardSetId,
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
} = useProductSearch()

const { cardSetFilterText, filteredCardSetChoices, isLoadingCardSets, cardSetsErrorMessage, chosenCardSetLabel }
  = useCardSetOptions(productCategory, cardSetId)

const blankProductContext = computed<BlankProductContext>(() => ({
  productCategory: productCategory.value,
  seriesName: cardSetId.value === null ? null : chosenCardSetLabel.value,
}))

const { errorMessage, isCreating, newProductName, pickCandidate, createBlankProduct } = useProductPicking(
  product => emit('picked', product),
  blankProductContext,
)
</script>

<style scoped>
.product-candidate-picker {
  display: grid;
  gap: 12px;
}

.product-candidate-picker__group {
  padding: 4px 0 6px;
}

.product-candidate-picker__creation {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}
</style>
