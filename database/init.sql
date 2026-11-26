-- ============================================================================
-- Cody - Esquema de Base de Datos PostgreSQL (esquema: maria)
-- Estructura: usuario -> rol -> rol_menu -> menu + cuenta_diaria
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS maria;

-- 1. Roles
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
);

-- 2. Menus (jerarquico: padre_id NULL = menu padre, padre_id != NULL = menu hijo)
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
);

-- 3. Relacion Rol <-> Menu (solo se asignan opciones hijo)
CREATE TABLE IF NOT EXISTS maria.rol_menu (
  id SERIAL PRIMARY KEY,
  rol_id INTEGER NOT NULL REFERENCES maria.rol(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES maria.menu(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por VARCHAR(100) NOT NULL DEFAULT 'sistema',
  UNIQUE (rol_id, menu_id)
);

-- 4. Usuarios
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
);

-- 5. Cuentas Diarias (aisladas por usuario_id)
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
);

CREATE INDEX IF NOT EXISTS idx_cuenta_diaria_usuario_fecha
  ON maria.cuenta_diaria (usuario_id, fecha_registro DESC, creado_en DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_menu_padre
  ON maria.menu (padre_id, orden);

CREATE INDEX IF NOT EXISTS idx_rol_menu_rol
  ON maria.rol_menu (rol_id);
