export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ADMIN_ROLES')

  const res = await dbQuery<{
    id: number
    codigo: string
    nombre: string
    ruta: string | null
    icono: string | null
    padre_id: number | null
    orden: number
  }>(
    `SELECT id, codigo, nombre, ruta, icono, padre_id, orden
     FROM maria.menu
     WHERE activo = TRUE
     ORDER BY COALESCE(padre_id, 0) ASC, orden ASC, id ASC`
  )

  const parents = res.rows
    .filter(m => m.padre_id === null)
    .map(p => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      icono: p.icono,
      orden: p.orden,
      hijos: res.rows
        .filter(h => h.padre_id === p.id)
        .map(h => ({
          id: h.id,
          codigo: h.codigo,
          nombre: h.nombre,
          ruta: h.ruta || '',
          icono: h.icono,
          orden: h.orden
        }))
    }))

  return parents
})
