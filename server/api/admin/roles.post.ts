import * as z from 'zod'

const createRoleSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del rol es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional().nullable(),
  menuIds: z.array(z.coerce.number().int().positive()).min(1, 'Selecciona al menos una opción de menú hijo')
})

export default defineEventHandler(async (event) => {
  const admin = await requireAuth(event, 'ADMIN_ROLES')
  const body = await readBody(event)

  const parsed = createRoleSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Datos de rol inválidos'
    })
  }

  const d = parsed.data
  const uniqueMenuIds = [...new Set(d.menuIds)]

  // Verificar que todos los menus seleccionados sean menus hijo validos (padre_id IS NOT NULL)
  const validMenusRes = await dbQuery<{ id: number }>(
    `SELECT id FROM maria.menu WHERE id = ANY($1::int[]) AND padre_id IS NOT NULL AND activo = TRUE`,
    [uniqueMenuIds]
  )
  if (validMenusRes.rows.length !== uniqueMenuIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solo se pueden asignar opciones de menú hijo válidas'
    })
  }

  const dupRes = await dbQuery<{ id: number }>(
    `SELECT id FROM maria.rol WHERE LOWER(nombre) = LOWER($1)`,
    [d.nombre]
  )
  if (dupRes.rows.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Ya existe un rol con ese nombre' })
  }

  const roleId = await withTransaction(async (client) => {
    const roleRes = await client.query<{ id: number }>(
      `INSERT INTO maria.rol (nombre, descripcion, es_admin, activo, creado_por, actualizado_por)
       VALUES ($1, $2, FALSE, TRUE, $3, $3)
       RETURNING id`,
      [d.nombre, d.descripcion || null, admin.username]
    )
    const newId = roleRes.rows[0]!.id

    for (const menuId of uniqueMenuIds) {
      await client.query(
        `INSERT INTO maria.rol_menu (rol_id, menu_id, creado_por)
         VALUES ($1, $2, $3)`,
        [newId, menuId, admin.username]
      )
    }
    return newId
  })

  return { ok: true, id: roleId }
})
