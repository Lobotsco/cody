import { dbQuery, withTransaction } from './db'
import { hashPassword } from './auth'

let initialized = false

export async function initializeDatabase(): Promise<void> {
  if (initialized) return

  await withTransaction(async (client) => {
    await client.query(`CREATE SCHEMA IF NOT EXISTS maria`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS maria.rol (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion VARCHAR(255),
        es_admin BOOLEAN NOT NULL DEFAULT FALSE,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        creado_por VARCHAR(100) NOT NULL DEFAULT 'sistema',
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_por VARCHAR(100) NOT NULL DEFAULT 'sistema'
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS maria.menu (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(60) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        ruta VARCHAR(150),
        icono VARCHAR(80),
        padre_id INTEGER REFERENCES maria.menu(id) ON DELETE CASCADE,
        orden INTEGER NOT NULL DEFAULT 0,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        creado_por VARCHAR(100) NOT NULL DEFAULT 'sistema',
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_por VARCHAR(100) NOT NULL DEFAULT 'sistema'
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS maria.rol_menu (
        id SERIAL PRIMARY KEY,
        rol_id INTEGER NOT NULL REFERENCES maria.rol(id) ON DELETE CASCADE,
        menu_id INTEGER NOT NULL REFERENCES maria.menu(id) ON DELETE CASCADE,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        creado_por VARCHAR(100) NOT NULL DEFAULT 'sistema',
        UNIQUE (rol_id, menu_id)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS maria.usuario (
        id SERIAL PRIMARY KEY,
        username VARCHAR(60) NOT NULL UNIQUE,
        nombre_completo VARCHAR(150) NOT NULL,
        email VARCHAR(150),
        password_hash TEXT NOT NULL,
        rol_id INTEGER NOT NULL REFERENCES maria.rol(id),
        bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
        es_admin_principal BOOLEAN NOT NULL DEFAULT FALSE,
        ultimo_acceso TIMESTAMPTZ,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        creado_por VARCHAR(100) NOT NULL DEFAULT 'sistema',
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_por VARCHAR(100) NOT NULL DEFAULT 'sistema'
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS maria.cuenta_diaria (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES maria.usuario(id) ON DELETE RESTRICT,
        valor NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
        es_entrada BOOLEAN NOT NULL DEFAULT FALSE,
        categoria_descripcion VARCHAR(255) NOT NULL,
        fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
        metodo_pago VARCHAR(50) NOT NULL DEFAULT 'Efectivo',
        referencia VARCHAR(100),
        notas TEXT,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        creado_por VARCHAR(100) NOT NULL,
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_por VARCHAR(100) NOT NULL
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cuenta_diaria_usuario_fecha
      ON maria.cuenta_diaria (usuario_id, fecha_registro DESC, creado_en DESC, id DESC)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_padre
      ON maria.menu (padre_id, orden)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rol_menu_rol
      ON maria.rol_menu (rol_id)
    `)

    // Menus padre
    const cuentasPadre = await client.query<{ id: number }>(
      `INSERT INTO maria.menu (codigo, nombre, ruta, icono, padre_id, orden)
       VALUES ('CUENTAS', 'Cuentas', NULL, 'i-lucide-wallet', NULL, 1)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, orden = EXCLUDED.orden
       RETURNING id`
    )
    const adminPadre = await client.query<{ id: number }>(
      `INSERT INTO maria.menu (codigo, nombre, ruta, icono, padre_id, orden)
       VALUES ('ADMINISTRACION', 'Administración', NULL, 'i-lucide-shield', NULL, 2)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, orden = EXCLUDED.orden
       RETURNING id`
    )

    const cuentasPadreId = cuentasPadre.rows[0]!.id
    const adminPadreId = adminPadre.rows[0]!.id

    // Menus hijo
    const childMenus = [
      {
        codigo: 'CUENTAS_DIARIAS',
        nombre: 'Diarias',
        ruta: '/cuentas/diarias',
        icono: 'i-lucide-receipt',
        padreId: cuentasPadreId,
        orden: 1
      },
      {
        codigo: 'ADMIN_USUARIOS',
        nombre: 'Usuarios',
        ruta: '/administracion/usuarios',
        icono: 'i-lucide-users',
        padreId: adminPadreId,
        orden: 1
      },
      {
        codigo: 'ADMIN_ROLES',
        nombre: 'Roles',
        ruta: '/administracion/roles',
        icono: 'i-lucide-key-round',
        padreId: adminPadreId,
        orden: 2
      }
    ]

    const childIds: number[] = []
    for (const cm of childMenus) {
      const res = await client.query<{ id: number }>(
        `INSERT INTO maria.menu (codigo, nombre, ruta, icono, padre_id, orden)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (codigo) DO UPDATE
         SET nombre = EXCLUDED.nombre, ruta = EXCLUDED.ruta, icono = EXCLUDED.icono,
             padre_id = EXCLUDED.padre_id, orden = EXCLUDED.orden
         RETURNING id`,
        [cm.codigo, cm.nombre, cm.ruta, cm.icono, cm.padreId, cm.orden]
      )
      childIds.push(res.rows[0]!.id)
    }

    // Rol Administrador
    const adminRoleRes = await client.query<{ id: number }>(
      `INSERT INTO maria.rol (nombre, descripcion, es_admin, activo)
       VALUES ('Administrador', 'Acceso total a todas las opciones de Cody', TRUE, TRUE)
       ON CONFLICT (nombre) DO UPDATE SET es_admin = TRUE, activo = TRUE
       RETURNING id`
    )
    const adminRoleId = adminRoleRes.rows[0]!.id

    // Asignar todos los menus hijo al rol Administrador
    for (const menuId of childIds) {
      await client.query(
        `INSERT INTO maria.rol_menu (rol_id, menu_id, creado_por)
         VALUES ($1, $2, 'sistema')
         ON CONFLICT (rol_id, menu_id) DO NOTHING`,
        [adminRoleId, menuId]
      )
    }

    // Usuario administrador inicial
    const config = useRuntimeConfig()
    const adminUsername = (process.env.ADMIN_USERNAME || config.adminUsername || 'admin').toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD || config.adminPassword || 'AdminCody2026*'
    const adminName = process.env.ADMIN_NAME || config.adminName || 'Administrador'
    const adminEmail = process.env.ADMIN_EMAIL || config.adminEmail || 'admin@cody.local'

    const existingAdmin = await client.query<{ id: number }>(
      `SELECT id FROM maria.usuario WHERE username = $1`,
      [adminUsername]
    )

    if (existingAdmin.rows.length === 0) {
      const passwordHash = hashPassword(adminPassword)
      await client.query(
        `INSERT INTO maria.usuario (username, nombre_completo, email, password_hash, rol_id, bloqueado, es_admin_principal, creado_por, actualizado_por)
         VALUES ($1, $2, $3, $4, $5, FALSE, TRUE, 'sistema', 'sistema')`,
        [adminUsername, adminName, adminEmail, passwordHash, adminRoleId]
      )
    }
  })

  // Verificacion rapida de conectividad
  await dbQuery('SELECT 1')
  initialized = true
  console.info('[cody:db] Esquema maria y datos iniciales verificados correctamente.')
}
