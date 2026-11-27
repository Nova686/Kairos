<template>
  <div class="picking-step-summary">
    <v-icon
      class="picking-step-summary__icon"
      :icon="icon"
    />
    <div class="picking-step-summary__text">
      <span class="kairos-label">{{ label }}</span>
      <span class="picking-step-summary__value">{{ value }}</span>
    </div>
    <v-btn
      variant="text"
      size="small"
      :aria-label="`Changer : ${label}`"
      @click="emit('change')"
    >
      Changer
    </v-btn>
  </div>
</template>

<script setup lang="ts">
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: String, required: true },
})

const emit = defineEmits<{ change: [] }>()
</script>

<style scoped>
.picking-step-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px 8px 12px;
  border: 1px solid var(--kairos-border);
  border-radius: calc(var(--kairos-radius) - 4px);
}

.picking-step-summary__icon {
  color: var(--kairos-text-secondary);
}

.picking-step-summary__text {
  display: grid;
  flex: 1;
  min-width: 0;
}

.picking-step-summary__value {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
