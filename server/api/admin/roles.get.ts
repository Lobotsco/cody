export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.menuCodigos.includes('ADMIN_ROLES') && !user.menuCodigos.includes('ADMIN_USUARIOS')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No tienes permisos para consultar los roles'
    })
  }

  const rolesRes = await dbQuery<{
    id: number
    nombre: string
    descripcion: string | null
    es_admin: boolean
    activo: boolean
    usuarios_count: string
    creado_en: string
    creado_por: string
    actualizado_en: string
    actualizado_por: string
  }>(
    `SELECT r.id, r.nombre, r.descripcion, r.es_admin, r.activo,
            COUNT(u.id)::text AS usuarios_count,
            r.creado_en, r.creado_por, r.actualizado_en, r.actualizado_por
     FROM maria.rol r
     LEFT JOIN maria.usuario u ON u.rol_id = r.id
     WHERE r.activo = TRUE
     GROUP BY r.id
     ORDER BY r.es_admin DESC, r.id ASC`
  )

  const permsRes = await dbQuery<{
    rol_id: number
    menu_id: number
    menu_nombre: string
    menu_codigo: string
    padre_nombre: string
  }>(
    `SELECT rm.rol_id, h.id AS menu_id, h.nombre AS menu_nombre, h.codigo AS menu_codigo,
            p.nombre AS padre_nombre
     FROM maria.rol_menu rm
     INNER JOIN maria.menu h ON h.id = rm.menu_id AND h.padre_id IS NOT NULL AND h.activo = TRUE
     INNER JOIN maria.menu p ON p.id = h.padre_id AND p.activo = TRUE
     ORDER BY p.orden ASC, h.orden ASC`
  )

  const permsByRole = new Map<number, Array<{ id: number, codigo: string, nombre: string, padreNombre: string }>>()
  for (const p of permsRes.rows) {
    const list = permsByRole.get(p.rol_id) || []
    list.push({
      id: p.menu_id,
      codigo: p.menu_codigo,
      nombre: p.menu_nombre,
      padreNombre: p.padre_nombre
    })
    permsByRole.set(p.rol_id, list)
  }

  return rolesRes.rows.map((r) => {
    const menus = permsByRole.get(r.id) || []
    return {
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      esAdmin: r.es_admin,
      activo: r.activo,
      usuariosCount: Number(r.usuarios_count),
      menuIds: menus.map(m => m.id),
      menus,
      creadoEn: r.creado_en,
      creadoPor: r.creado_por,
      actualizadoEn: r.actualizado_en,
      actualizadoPor: r.actualizado_por
    }
  })
})
