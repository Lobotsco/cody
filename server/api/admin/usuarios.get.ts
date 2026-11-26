export default defineEventHandler(async (event) => {
  await requireAuth(event, 'ADMIN_USUARIOS')

  const res = await dbQuery<{
    id: number
    username: string
    nombre_completo: string
    email: string | null
    rol_id: number
    rol_nombre: string
    es_admin: boolean
    bloqueado: boolean
    es_admin_principal: boolean
    ultimo_acceso: string | null
    creado_en: string
    creado_por: string
    actualizado_en: string
    actualizado_por: string
  }>(
    `SELECT u.id, u.username, u.nombre_completo, u.email, u.rol_id,
            r.nombre AS rol_nombre, r.es_admin,
            u.bloqueado, u.es_admin_principal, u.ultimo_acceso,
            u.creado_en, u.creado_por, u.actualizado_en, u.actualizado_por
     FROM maria.usuario u
     INNER JOIN maria.rol r ON r.id = u.rol_id
     ORDER BY u.es_admin_principal DESC, u.id ASC`
  )

  return res.rows.map(u => ({
    id: u.id,
    username: u.username,
    nombreCompleto: u.nombre_completo,
    email: u.email,
    rolId: u.rol_id,
    rolNombre: u.rol_nombre,
    esAdmin: u.es_admin,
    bloqueado: u.bloqueado,
    esAdminPrincipal: u.es_admin_principal,
    ultimoAcceso: u.ultimo_acceso,
    creadoEn: u.creado_en,
    creadoPor: u.creado_por,
    actualizadoEn: u.actualizado_en,
    actualizadoPor: u.actualizado_por
  }))
})
