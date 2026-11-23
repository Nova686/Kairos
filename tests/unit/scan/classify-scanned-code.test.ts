import { classifyScannedCode } from '../../../app/utils/classify-scanned-code.ts'

describe('classifyScannedCode', () => {
  it('routes a valid barcode to the barcode lookup and normalizes UPC-A', () => {
    expect(classifyScannedCode('3017620422003')).toEqual({ kind: 'barcode', barcode: '3017620422003' })
    expect(classifyScannedCode(' 036000291452 ')).toEqual({ kind: 'barcode', barcode: '0036000291452' })
  })

  it('rejects a barcode with a wrong check digit or non digits', () => {
    expect(classifyScannedCode('3017620422004')).toEqual({ kind: 'invalid' })
    expect(classifyScannedCode('abc')).toEqual({ kind: 'invalid' })
  })
})
