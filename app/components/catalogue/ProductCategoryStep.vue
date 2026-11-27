<template>
  <section
    class="product-category-step"
    aria-labelledby="product-category-step-title"
  >
    <h2
      id="product-category-step-title"
      class="kairos-label"
    >
      Type de produit
    </h2>
    <div class="product-category-step__tiles">
      <v-btn
        v-for="categoryTile in productCategoryTiles"
        :key="categoryTile.category"
        class="product-category-step__tile"
        :prepend-icon="categoryTile.glyph"
        variant="tonal"
        height="88"
        stacked
        @click="emit('chosen', categoryTile.category)"
      >
        {{ categoryTile.label }}
      </v-btn>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ProductCategory } from '~~/shared/catalogue/product-category'

const emit = defineEmits<{ chosen: [productCategory: ProductCategory] }>()
</script>

<style scoped>
.product-category-step {
  display: grid;
  gap: 8px;
}

.product-category-step__tiles {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.product-category-step__tile {
  text-transform: none;
  letter-spacing: normal;
}
</style>
