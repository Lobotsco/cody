export default defineNitroPlugin(async () => {
  try {
    await initializeDatabase()
  } catch (err) {
    console.error('[cody:db] No se pudo inicializar la base de datos al arrancar:', err)
  }
})
