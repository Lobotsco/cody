import * as z from 'zod'

const updateRoleSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del rol es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional().nullable(),
  menuIds: z.array(z.coerce.number().int().positive()).min(1, 'Selecciona al menos una opción de menú hijo')
})

export default defineEventHandler(async (event) => {
  const admin = await requireAuth(event, 'ADMIN_ROLES')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de rol inválido' })
  }

  const body = await readBody(event)
  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Datos de rol inválidos'
    })
  }

  const existingRes = await dbQuery<{ id: number, es_admin: boolean }>(
    `SELECT id, es_admin FROM maria.rol WHERE id = $1`,
    [id]
  )
  const existing = existingRes.rows[0]
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Rol no encontrado' })
  }

  const d = parsed.data
  const uniqueMenuIds = [...new Set(d.menuIds)]

  const validMenusRes = await dbQuery<{ id: number, codigo: string }>(
    `SELECT id, codigo FROM maria.menu WHERE id = ANY($1::int[]) AND padre_id IS NOT NULL AND activo = TRUE`,
    [uniqueMenuIds]
  )
  if (validMenusRes.rows.length !== uniqueMenuIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solo se pueden asignar opciones de menú hijo válidas'
    })
  }

  // Proteger el rol Administrador para que nunca pierda acceso a Usuarios y Roles
  if (existing.es_admin) {
    const selectedCodigos = validMenusRes.rows.map(m => m.codigo)
    if (!selectedCodigos.includes('ADMIN_USUARIOS') || !selectedCodigos.includes('ADMIN_ROLES')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El rol Administrador debe conservar acceso a Usuarios y Roles'
      })
    }
  }

  const dupRes = await dbQuery<{ id: number }>(
    `SELECT id FROM maria.rol WHERE LOWER(nombre) = LOWER($1) AND id <> $2`,
    [d.nombre, id]
  )
  if (dupRes.rows.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Ya existe otro rol con ese nombre' })
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE maria.rol
       SET nombre = $1, descripcion = $2, actualizado_en = NOW(), actualizado_por = $3
       WHERE id = $4`,
      [d.nombre, d.descripcion || null, admin.username, id]
    )

    await client.query(`DELETE FROM maria.rol_menu WHERE rol_id = $1`, [id])

    for (const menuId of uniqueMenuIds) {
      await client.query(
        `INSERT INTO maria.rol_menu (rol_id, menu_id, creado_por)
         VALUES ($1, $2, $3)`,
        [id, menuId, admin.username]
      )
    }
  })

  return { ok: true, id }
})
