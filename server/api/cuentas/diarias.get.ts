export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, 'CUENTAS_DIARIAS')
  const query = getQuery(event)

  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const tipo = typeof query.tipo === 'string' ? query.tipo : 'todos'
  const desde = typeof query.desde === 'string' ? query.desde.trim() : ''
  const hasta = typeof query.hasta === 'string' ? query.hasta.trim() : ''

  const conditions: string[] = ['usuario_id = $1']
  const params: unknown[] = [user.id]
  let idx = 2

  if (search) {
    conditions.push(`(categoria_descripcion ILIKE $${idx} OR COALESCE(metodo_pago, '') ILIKE $${idx} OR COALESCE(referencia, '') ILIKE $${idx} OR COALESCE(notas, '') ILIKE $${idx})`)
    params.push(`%${search}%`)
    idx++
  }

  if (tipo === 'entrada') {
    conditions.push('es_entrada = TRUE')
  } else if (tipo === 'salida') {
    conditions.push('es_entrada = FALSE')
  }

  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    conditions.push(`fecha_registro >= $${idx}::date`)
    params.push(desde)
    idx++
  }

  if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    conditions.push(`fecha_registro <= $${idx}::date`)
    params.push(hasta)
    idx++
  }

  const whereClause = conditions.join(' AND ')

  const rowsRes = await dbQuery<{
    id: number
    usuario_id: number
    valor: string
    es_entrada: boolean
    categoria_descripcion: string
    fecha_registro: string
    metodo_pago: string
    referencia: string | null
    notas: string | null
    creado_en: string
    creado_por: string
    actualizado_en: string
    actualizado_por: string
  }>(
    `SELECT id, usuario_id, valor::text, es_entrada, categoria_descripcion,
            TO_CHAR(fecha_registro, 'YYYY-MM-DD') AS fecha_registro,
            metodo_pago, referencia, notas,
            creado_en, creado_por, actualizado_en, actualizado_por
     FROM maria.cuenta_diaria
     WHERE ${whereClause}
     ORDER BY fecha_registro DESC, creado_en DESC, id DESC`,
    params
  )

  const summaryRes = await dbQuery<{
    total_entradas: string
    total_salidas: string
    cantidad: string
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN es_entrada THEN valor ELSE 0 END), 0)::text AS total_entradas,
       COALESCE(SUM(CASE WHEN NOT es_entrada THEN valor ELSE 0 END), 0)::text AS total_salidas,
       COUNT(*)::text AS cantidad
     FROM maria.cuenta_diaria
     WHERE ${whereClause}`,
    params
  )

  const summaryRow = summaryRes.rows[0]
  const totalEntradas = Number(summaryRow?.total_entradas || 0)
  const totalSalidas = Number(summaryRow?.total_salidas || 0)

  return {
    items: rowsRes.rows.map(r => ({
      id: r.id,
      usuarioId: r.usuario_id,
      valor: Number(r.valor),
      esEntrada: r.es_entrada,
      categoriaDescripcion: r.categoria_descripcion,
      fechaRegistro: r.fecha_registro,
      metodoPago: r.metodo_pago,
      referencia: r.referencia,
      notas: r.notas,
      creadoEn: r.creado_en,
      creadoPor: r.creado_por,
      actualizadoEn: r.actualizado_en,
      actualizadoPor: r.actualizado_por
    })),
    resumen: {
      totalEntradas,
      totalSalidas,
      balance: Number((totalEntradas - totalSalidas).toFixed(2)),
      cantidad: Number(summaryRow?.cantidad || 0)
    }
  }
})
