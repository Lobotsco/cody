import * as z from 'zod'

const bloqueoSchema = z.object({
  bloqueado: z.boolean()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAuth(event, 'ADMIN_USUARIOS')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de usuario inválido' })
  }

  const body = await readBody(event)
  const parsed = bloqueoSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Parámetro bloqueado inválido' })
  }

  const targetRes = await dbQuery<{
    id: number
    es_admin_principal: boolean
    es_admin: boolean
  }>(
    `SELECT u.id, u.es_admin_principal, r.es_admin
     FROM maria.usuario u
     INNER JOIN maria.rol r ON r.id = u.rol_id
     WHERE u.id = $1`,
    [id]
  )

  const target = targetRes.rows[0]
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })
  }

  if (parsed.data.bloqueado && (target.es_admin_principal || target.es_admin)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No está permitido bloquear al usuario administrador'
    })
  }

  await dbQuery(
    `UPDATE maria.usuario
     SET bloqueado = $1, actualizado_en = NOW(), actualizado_por = $2
     WHERE id = $3`,
    [parsed.data.bloqueado, admin.username, id]
  )

  return { ok: true, id, bloqueado: parsed.data.bloqueado }
})
