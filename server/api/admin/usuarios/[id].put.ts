import * as z from 'zod'

const updateUserSchema = z.object({
  nombreCompleto: z.string().trim().min(2, 'El nombre completo es obligatorio').max(150),
  email: z.string().trim().email('Correo electrónico inválido').optional().or(z.literal('')).nullable(),
  rolId: z.coerce.number().int().positive('Debes seleccionar un rol'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128).optional().or(z.literal(''))
})

export default defineEventHandler(async (event) => {
  const admin = await requireAuth(event, 'ADMIN_USUARIOS')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de usuario inválido' })
  }

  const body = await readBody(event)
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Datos de usuario inválidos'
    })
  }

  const existingRes = await dbQuery<{
    id: number
    es_admin_principal: boolean
  }>(
    `SELECT id, es_admin_principal FROM maria.usuario WHERE id = $1`,
    [id]
  )
  const existing = existingRes.rows[0]
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })
  }

  const d = parsed.data
  const roleRes = await dbQuery<{ id: number, es_admin: boolean }>(
    `SELECT id, es_admin FROM maria.rol WHERE id = $1 AND activo = TRUE`,
    [d.rolId]
  )
  const role = roleRes.rows[0]
  if (!role) {
    throw createError({ statusCode: 400, statusMessage: 'El rol seleccionado no existe' })
  }

  if (existing.es_admin_principal && !role.es_admin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede cambiar el rol del usuario administrador principal'
    })
  }

  if (d.password && d.password.length >= 6) {
    const passwordHash = hashPassword(d.password)
    await dbQuery(
      `UPDATE maria.usuario
       SET nombre_completo = $1, email = $2, rol_id = $3, password_hash = $4,
           actualizado_en = NOW(), actualizado_por = $5
       WHERE id = $6`,
      [d.nombreCompleto, d.email ? d.email : null, d.rolId, passwordHash, admin.username, id]
    )
  } else {
    await dbQuery(
      `UPDATE maria.usuario
       SET nombre_completo = $1, email = $2, rol_id = $3,
           actualizado_en = NOW(), actualizado_por = $4
       WHERE id = $5`,
      [d.nombreCompleto, d.email ? d.email : null, d.rolId, admin.username, id]
    )
  }

  return { ok: true, id }
})
