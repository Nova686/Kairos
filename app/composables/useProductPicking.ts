import type { Ref } from 'vue'
import type { ProductCandidate } from '~~/shared/catalogue/product-candidate'
import type { ProductCategory } from '~~/shared/catalogue/product-category'
import type { ProductReference } from '~~/shared/catalogue/product-reference'

export interface BlankProductContext {
  productCategory: ProductCategory | null
  seriesName: string | null
}

export const useProductPicking = (
  onProductPicked: (product: ProductReference) => void,
  blankProductContext: Ref<BlankProductContext>,
) => {
  const errorMessage = ref('')
  const isCreating = ref(false)
  const newProductName = ref('')

  const createProductFrom = async (productDraft: Record<string, unknown>): Promise<boolean> => {
    if (isCreating.value) {
      return false
    }
    isCreating.value = true
    errorMessage.value = ''
    try {
      const createdProduct = await $fetch<ProductReference>('/api/products', { method: 'POST', body: productDraft })
      onProductPicked({ id: createdProduct.id, name: createdProduct.name, category: createdProduct.category })
      return true
    }
    catch {
      errorMessage.value = 'Impossible de créer ce produit.'
      return false
    }
    finally {
      isCreating.value = false
    }
  }

  const pickCandidate = async (candidate: ProductCandidate): Promise<void> => {
    if (candidate.productId !== null) {
      onProductPicked({ id: candidate.productId, name: candidate.draft.name, category: candidate.draft.category })
      return
    }
    await createProductFrom({ ...candidate.draft })
  }

  const createBlankProduct = async (): Promise<void> => {
    const { productCategory, seriesName } = blankProductContext.value
    if (newProductName.value.trim() === '' || productCategory === null) {
      return
    }
    if (await createProductFrom({ name: newProductName.value, category: productCategory, seriesName })) {
      newProductName.value = ''
    }
  }

  return { errorMessage, isCreating, newProductName, pickCandidate, createBlankProduct }
}
