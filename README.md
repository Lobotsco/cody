# Cody — Control de Cuentas Diarias

Aplicación web responsiva construida con **Nuxt 4** y el template gratuito **Nuxt UI Dashboard**, conectada a **PostgreSQL** (esquema `maria`) y lista para ejecutarse en **Docker** por el puerto **9022**.

## Funcionalidades principales

- **Autenticación y control de acceso por roles y menús** (`usuario -> rol -> rol_menu -> menu`):
  - Sesión segura mediante cookies `httpOnly` firmadas con HMAC-SHA256.
  - Contraseñas almacenadas con hash `scrypt`.
  - Usuario administrador inicial con acceso completo a todas las opciones.
- **Cuentas -> Diarias**:
  - Registro de movimientos diarios con **Valor** (decimales con punto `.`, ej. `15000.50`), **Tipo** (check Entrada / Salida), **Categoría o descripción**, **Fecha de registro**, además de campos opcionales (**Método de pago**, **Referencia / Comprobante**, **Notas**) y campos de auditoría.
  - Reseña visible en el encabezado indicando el formato de decimales.
  - Listado ordenado de forma descendente por fecha y hora de creación (último ingreso primero).
  - Aislamiento por usuario: cada usuario solo visualiza, edita y elimina sus propios registros.
  - Diseño responsivo (tarjetas en móvil y tabla en escritorio).
- **Administración -> Usuarios**:
  - Creación y edición de usuarios con asignación de rol.
  - Bloqueo y desbloqueo de acceso a usuarios, con protección para que el administrador nunca pueda ser bloqueado.
- **Administración -> Roles**:
  - Creación, edición y eliminación de roles asignando permisos sobre las **opciones de menú hijo**.

## Ejecución con Docker (Puerto 9022)

```bash
cp .env.example .env
# Ajusta las credenciales en .env si es necesario
docker compose up -d --build
```

La aplicación quedará disponible en: `http://localhost:9022`

## Desarrollo local

```bash
pnpm install
pnpm run dev
```
