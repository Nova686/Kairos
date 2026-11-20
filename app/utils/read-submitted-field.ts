export const readSubmittedField = (submitEvent: Event | undefined, fieldName: string, typedValue: string): string => {
  const submittedForm = submitEvent?.target
  if (typeof HTMLFormElement === 'undefined' || !(submittedForm instanceof HTMLFormElement)) {
    return typedValue
  }
  const submittedValue = new FormData(submittedForm).get(fieldName)
  return typeof submittedValue === 'string' && submittedValue !== '' ? submittedValue : typedValue
}
