export default defineEventHandler(async (event) => {
  await initializeDatabase()
  const user = await getSessionUser(event)
  return { user }
})
