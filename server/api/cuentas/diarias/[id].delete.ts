export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, 'CUENTAS_DIARIAS')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de registro inválido' })
  }

  const res = await dbQuery<{ id: number }>(
    `DELETE FROM maria.cuenta_diaria
     WHERE id = $1 AND usuario_id = $2
     RETURNING id`,
    [id, user.id]
  )

  if (res.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Registro no encontrado o no pertenece a tu usuario' })
  }

  return { ok: true, id }
})
