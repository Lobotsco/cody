import * as z from 'zod'

const createUserSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres').max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, 'El usuario solo puede contener letras, números, puntos, guiones y guion bajo'),
  nombreCompleto: z.string().trim().min(2, 'El nombre completo es obligatorio').max(150),
  email: z.string().trim().email('Correo electrónico inválido').optional().or(z.literal('')).nullable(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128),
  rolId: z.coerce.number().int().positive('Debes seleccionar un rol')
})

export default defineEventHandler(async (event) => {
  const admin = await requireAuth(event, 'ADMIN_USUARIOS')
  const body = await readBody(event)

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Datos de usuario inválidos'
    })
  }

  const d = parsed.data
  const usernameLower = d.username.toLowerCase()

  const roleCheck = await dbQuery<{ id: number }>(
    `SELECT id FROM maria.rol WHERE id = $1 AND activo = TRUE`,
    [d.rolId]
  )
  if (roleCheck.rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'El rol seleccionado no existe' })
  }

  const dupCheck = await dbQuery<{ id: number }>(
    `SELECT id FROM maria.usuario WHERE LOWER(username) = $1`,
    [usernameLower]
  )
  if (dupCheck.rows.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Ya existe un usuario con ese nombre de usuario' })
  }

  const passwordHash = hashPassword(d.password)

  const res = await dbQuery<{ id: number }>(
    `INSERT INTO maria.usuario (
       username, nombre_completo, email, password_hash, rol_id,
       bloqueado, es_admin_principal, creado_por, actualizado_por
     )
     VALUES ($1, $2, $3, $4, $5, FALSE, FALSE, $6, $6)
     RETURNING id`,
    [
      usernameLower,
      d.nombreCompleto,
      d.email ? d.email : null,
      passwordHash,
      d.rolId,
      admin.username
    ]
  )

  return { ok: true, id: res.rows[0]!.id }
})
