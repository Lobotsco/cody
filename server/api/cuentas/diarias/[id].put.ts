import * as z from 'zod'

const decimalRegex = /^\d+(\.\d{1,2})?$/

const cuentaUpdateSchema = z.object({
  valor: z.union([z.number(), z.string()]).transform((val, ctx) => {
    const str = String(val).trim()
    if (str.includes(',')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Usa punto (.) para decimales y no incluyas comas ni separadores de miles (ej: 15000.50)'
      })
      return z.NEVER
    }
    if (!decimalRegex.test(str)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ingresa un valor numérico válido con máximo 2 decimales usando punto (ej: 25000.50)'
      })
      return z.NEVER
    }
    const num = Number(str)
    if (!Number.isFinite(num) || num <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'El valor debe ser mayor a 0'
      })
      return z.NEVER
    }
    return num
  }),
  esEntrada: z.boolean(),
  categoriaDescripcion: z.string().trim().min(1, 'La categoría o descripción es obligatoria').max(255),
  fechaRegistro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de registro es obligatoria (YYYY-MM-DD)'),
  metodoPago: z.string().trim().min(1).max(50).optional().default('Efectivo'),
  referencia: z.string().trim().max(100).optional().nullable(),
  notas: z.string().trim().max(1000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, 'CUENTAS_DIARIAS')
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de registro inválido' })
  }

  const body = await readBody(event)
  const parsed = cuentaUpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Datos inválidos'
    })
  }

  const d = parsed.data
  const res = await dbQuery<{
    id: number
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
    `UPDATE maria.cuenta_diaria
     SET valor = $1,
         es_entrada = $2,
         categoria_descripcion = $3,
         fecha_registro = $4::date,
         metodo_pago = $5,
         referencia = $6,
         notas = $7,
         actualizado_en = NOW(),
         actualizado_por = $8
     WHERE id = $9 AND usuario_id = $10
     RETURNING id, valor::text, es_entrada, categoria_descripcion,
               TO_CHAR(fecha_registro, 'YYYY-MM-DD') AS fecha_registro,
               metodo_pago, referencia, notas,
               creado_en, creado_por, actualizado_en, actualizado_por`,
    [
      d.valor,
      d.esEntrada,
      d.categoriaDescripcion,
      d.fechaRegistro,
      d.metodoPago || 'Efectivo',
      d.referencia || null,
      d.notas || null,
      user.username,
      id,
      user.id
    ]
  )

  const r = res.rows[0]
  if (!r) {
    throw createError({ statusCode: 404, statusMessage: 'Registro no encontrado o no pertenece a tu usuario' })
  }

  return {
    id: r.id,
    usuarioId: user.id,
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
  }
})
