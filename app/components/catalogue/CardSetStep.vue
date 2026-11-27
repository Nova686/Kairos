<template>
  <section
    class="card-set-step"
    aria-labelledby="card-set-step-title"
  >
    <h2
      id="card-set-step-title"
      class="kairos-label"
    >
      Extension
    </h2>
    <v-text-field
      v-model="filterText"
      label="Filtrer les extensions"
      prepend-inner-icon="mdi-magnify"
      clearable
      hide-details
    />
    <v-progress-linear
      v-if="isLoading"
      indeterminate
    />
    <v-alert
      v-if="errorMessage"
      type="error"
      role="alert"
    >
      {{ errorMessage }}
    </v-alert>
    <v-list
      bg-color="transparent"
      class="card-set-step__list pa-0"
    >
      <v-list-item
        title="Sans extension"
        subtitle="Chercher dans tout le catalogue"
        prepend-icon="mdi-magnify"
        rounded="lg"
        @click="emit('skipped')"
      />
      <v-list-item
        v-for="cardSetChoice in choices"
        :key="cardSetChoice.id"
        :title="cardSetChoice.name"
        :subtitle="cardSetChoice.subtitle"
        prepend-icon="mdi-cards-outline"
        rounded="lg"
        @click="emit('chosen', cardSetChoice.id)"
      />
      <v-list-item
        v-if="!isLoading && !errorMessage && choices.length === 0"
        title="Aucune extension"
        disabled
      />
    </v-list>
  </section>
</template>

<script setup lang="ts">
import type { CardSetChoice } from '~/utils/card-set-option-view'

defineProps({
  choices: { type: Array as PropType<CardSetChoice[]>, required: true },
  isLoading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})

const filterText = defineModel<string | null>('filterText', { default: '' })

const emit = defineEmits<{ chosen: [cardSetId: string], skipped: [] }>()
</script>

<style scoped>
.card-set-step {
  display: grid;
  gap: 8px;
}

.card-set-step__list {
  max-height: 420px;
  overflow-y: auto;
}
</style>
