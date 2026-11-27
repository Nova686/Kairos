<template>
  <v-list
    bg-color="transparent"
    class="pa-0"
  >
    <v-list-item
      v-for="candidate in candidates"
      :key="productCandidateKey(candidate)"
      :title="candidate.label"
      :subtitle="describeCandidateSubtitle(candidate, pendingBarcode)"
      rounded="lg"
      @click="emit('picked', candidate)"
    >
      <template #prepend>
        <ProductThumbnail
          class="mr-3"
          :category="candidate.draft.category"
          :image-url="candidate.imageUrl"
        />
      </template>
      <template #append>
        <v-chip
          v-if="isScanResult"
          color="primary"
          prepend-icon="mdi-plus"
        >
          Ajouter
        </v-chip>
        <v-icon
          v-else-if="candidate.origin === 'catalogue'"
          icon="mdi-check-circle"
          color="primary"
        />
        <v-chip
          v-else
          prepend-icon="mdi-plus"
        >
          Créer
        </v-chip>
      </template>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import type { ProductCandidate } from '~~/shared/catalogue/product-candidate'

defineProps({
  candidates: { type: Array as PropType<ProductCandidate[]>, required: true },
  pendingBarcode: { type: String as PropType<string | null>, default: null },
  isScanResult: { type: Boolean, default: false },
})

const emit = defineEmits<{ picked: [candidate: ProductCandidate] }>()
</script>
