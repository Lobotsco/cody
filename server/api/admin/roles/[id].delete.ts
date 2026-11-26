export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ADMIN_ROLES')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de rol inválido' })
  }

  const roleRes = await dbQuery<{ id: number, es_admin: boolean }>(
    `SELECT id, es_admin FROM maria.rol WHERE id = $1`,
    [id]
  )
  const role = roleRes.rows[0]
  if (!role) {
    throw createError({ statusCode: 404, statusMessage: 'Rol no encontrado' })
  }

  if (role.es_admin) {
    throw createError({ statusCode: 400, statusMessage: 'No se puede eliminar el rol Administrador' })
  }

  const usersRes = await dbQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM maria.usuario WHERE rol_id = $1`,
    [id]
  )
  if (Number(usersRes.rows[0]?.count || 0) > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se puede eliminar un rol que tiene usuarios asignados'
    })
  }

  await dbQuery(`DELETE FROM maria.rol WHERE id = $1`, [id])
  return { ok: true, id }
})
