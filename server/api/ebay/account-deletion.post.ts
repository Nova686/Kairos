export default defineEventHandler((event) => {
  readEbayAccountDeletionSettings(event)
  setResponseStatus(event, 204)
  return null
})
