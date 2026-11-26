import * as z from 'zod'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña')
})

export default defineEventHandler(async (event) => {
  await initializeDatabase()

  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Datos de acceso inválidos'
    })
  }

  const username = parsed.data.username.toLowerCase()

  const res = await dbQuery<{
    id: number
    username: string
    password_hash: string
    bloqueado: boolean
  }>(
    `SELECT id, username, password_hash, bloqueado
     FROM maria.usuario
     WHERE LOWER(username) = $1`,
    [username]
  )

  const user = res.rows[0]
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Usuario o contraseña incorrectos'
    })
  }

  if (user.bloqueado) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu usuario se encuentra bloqueado. Contacta al administrador.'
    })
  }

  await dbQuery(
    `UPDATE maria.usuario SET ultimo_acceso = NOW() WHERE id = $1`,
    [user.id]
  )

  setSessionCookie(event, user.id)
  const sessionUser = await getSessionUserById(user.id)

  return {
    user: sessionUser
  }
})
