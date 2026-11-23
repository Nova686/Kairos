import { normalizeBarcode } from '~~/shared/scan/normalize-barcode.ts'

export type ClassifiedScanCode =
  | { kind: 'barcode', barcode: string }
  | { kind: 'invalid' }

export const classifyScannedCode = (rawCode: string): ClassifiedScanCode => {
  const barcode = normalizeBarcode(rawCode.trim())
  return barcode === null ? { kind: 'invalid' } : { kind: 'barcode', barcode }
}
