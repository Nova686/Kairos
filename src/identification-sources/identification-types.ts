export interface ProductIdentification {
  source: 'openbeautyfacts' | 'upcitemdb'
  name: string
  brand: string | null
  imageUrl: string | null
  barcode: string | null
}
