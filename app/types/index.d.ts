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

export interface AuthUser {
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

export interface CuentaDiaria {
  id: number
  usuarioId: number
  valor: number
  esEntrada: boolean
  categoriaDescripcion: string
  fechaRegistro: string
  metodoPago: string
  referencia: string | null
  notas: string | null
  creadoEn: string
  creadoPor: string
  actualizadoEn: string
  actualizadoPor: string
}

export interface CuentasDiariasResumen {
  totalEntradas: number
  totalSalidas: number
  balance: number
  cantidad: number
}

export interface CuentasDiariasResponse {
  items: CuentaDiaria[]
  resumen: CuentasDiariasResumen
}

export interface AdminUsuario {
  id: number
  username: string
  nombreCompleto: string
  email: string | null
  rolId: number
  rolNombre: string
  esAdmin: boolean
  bloqueado: boolean
  esAdminPrincipal: boolean
  ultimoAcceso: string | null
  creadoEn: string
  creadoPor: string
  actualizadoEn: string
  actualizadoPor: string
}

export interface AdminRolMenu {
  id: number
  codigo: string
  nombre: string
  padreNombre: string
}

export interface AdminRol {
  id: number
  nombre: string
  descripcion: string | null
  esAdmin: boolean
  activo: boolean
  usuariosCount: number
  menuIds: number[]
  menus: AdminRolMenu[]
  creadoEn: string
  creadoPor: string
  actualizadoEn: string
  actualizadoPor: string
}
