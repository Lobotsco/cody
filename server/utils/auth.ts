import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

export const SESSION_COOKIE_NAME = 'cody_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 dias

export interface MenuChildItem {
  id: number
  codigo: string
  nombre: string
  ruta: string
  icono: string | null
  orden: number
}

export interface MenuTreeItem {
  id: number
  codigo: string
  nombre: string
  icono: string | null
  orden: number
  hijos: MenuChildItem[]
}

export interface SessionUser {
  id: number
  username: string
  nombreCompleto: string
  email: string | null
  rolId: number
  rolNombre: string
  esAdmin: boolean
  esAdminPrincipal: boolean
  bloqueado: boolean
  menus: MenuTreeItem[]
  menuCodigos: string[]
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':')
  if (parts.length !== 2) return false
  const [salt, keyHex] = parts
  if (!salt || !keyHex) return false
  const derived = scryptSync(password, salt, 64)
  const storedKey = Buffer.from(keyHex, 'hex')
  if (derived.length !== storedKey.length) return false
  return timingSafeEqual(derived, storedKey)
}

function getSessionSecret(): string {
  const config = useRuntimeConfig()
  return process.env.SESSION_SECRET || config.sessionSecret || 'cody-default-secret'
}

interface TokenPayload {
  uid: number
  exp: number
}

export function signSessionToken(userId: number): string {
  const payload: TokenPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  }
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifySessionToken(token: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [encoded, sig] = parts
  if (!encoded || !sig) return null

  const expectedSig = createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload
    if (!payload.uid || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function setSessionCookie(event: H3Event, userId: number): void {
  const token = signSessionToken(userId)
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  })
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  })
}

export async function getSessionUserById(userId: number): Promise<SessionUser | null> {
  const userRes = await dbQuery<{
    id: number
    username: string
    nombre_completo: string
    email: string | null
    rol_id: number
    rol_nombre: string
    es_admin: boolean
    es_admin_principal: boolean
    bloqueado: boolean
  }>(
    `SELECT u.id, u.username, u.nombre_completo, u.email, u.rol_id,
            r.nombre AS rol_nombre, r.es_admin, u.es_admin_principal, u.bloqueado
     FROM maria.usuario u
     INNER JOIN maria.rol r ON r.id = u.rol_id
     WHERE u.id = $1 AND r.activo = TRUE`,
    [userId]
  )

  const row = userRes.rows[0]
  if (!row || row.bloqueado) {
    return null
  }

  // Cargar menus hijo permitidos para el rol del usuario, junto con sus menus padre
  const menusRes = await dbQuery<{
    hijo_id: number
    hijo_codigo: string
    hijo_nombre: string
    hijo_ruta: string
    hijo_icono: string | null
    hijo_orden: number
    padre_id: number
    padre_codigo: string
    padre_nombre: string
    padre_icono: string | null
    padre_orden: number
  }>(
    `SELECT h.id AS hijo_id, h.codigo AS hijo_codigo, h.nombre AS hijo_nombre,
            h.ruta AS hijo_ruta, h.icono AS hijo_icono, h.orden AS hijo_orden,
            p.id AS padre_id, p.codigo AS padre_codigo, p.nombre AS padre_nombre,
            p.icono AS padre_icono, p.orden AS padre_orden
     FROM maria.rol_menu rm
     INNER JOIN maria.menu h ON h.id = rm.menu_id AND h.padre_id IS NOT NULL AND h.activo = TRUE
     INNER JOIN maria.menu p ON p.id = h.padre_id AND p.activo = TRUE
     WHERE rm.rol_id = $1
     ORDER BY p.orden ASC, h.orden ASC`,
    [row.rol_id]
  )

  const treeMap = new Map<number, MenuTreeItem>()
  const menuCodigos: string[] = []

  for (const m of menusRes.rows) {
    menuCodigos.push(m.hijo_codigo)
    let parent = treeMap.get(m.padre_id)
    if (!parent) {
      parent = {
        id: m.padre_id,
        codigo: m.padre_codigo,
        nombre: m.padre_nombre,
        icono: m.padre_icono,
        orden: m.padre_orden,
        hijos: []
      }
      treeMap.set(m.padre_id, parent)
    }
    parent.hijos.push({
      id: m.hijo_id,
      codigo: m.hijo_codigo,
      nombre: m.hijo_nombre,
      ruta: m.hijo_ruta,
      icono: m.hijo_icono,
      orden: m.hijo_orden
    })
  }

  return {
    id: row.id,
    username: row.username,
    nombreCompleto: row.nombre_completo,
    email: row.email,
    rolId: row.rol_id,
    rolNombre: row.rol_nombre,
    esAdmin: row.es_admin,
    esAdminPrincipal: row.es_admin_principal,
    bloqueado: row.bloqueado,
    menus: Array.from(treeMap.values()),
    menuCodigos
  }
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, SESSION_COOKIE_NAME)
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  return getSessionUserById(payload.uid)
}

export async function requireAuth(event: H3Event, requiredMenuCode?: string): Promise<SessionUser> {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autenticado o usuario bloqueado'
    })
  }

  if (requiredMenuCode && !user.menuCodigos.includes(requiredMenuCode)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No tienes permisos para acceder a esta opcion'
    })
  }

  return user
}
