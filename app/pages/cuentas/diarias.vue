<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CuentaDiaria, CuentasDiariasResponse } from '~/types'

const toast = useToast()

const metodosPago = [
  'Efectivo',
  'Transferencia',
  'Nequi / Daviplata',
  'Tarjeta Débito',
  'Tarjeta Crédito',
  'Otro'
]

// Filtros
const search = ref('')
const tipoFilter = ref<'todos' | 'entrada' | 'salida'>('todos')
const desde = ref('')
const hasta = ref('')

const queryParams = computed(() => ({
  search: search.value || undefined,
  tipo: tipoFilter.value !== 'todos' ? tipoFilter.value : undefined,
  desde: desde.value || undefined,
  hasta: hasta.value || undefined
}))

const { data, status, refresh } = await useFetch<CuentasDiariasResponse>('/api/cuentas/diarias', {
  query: queryParams,
  watch: [queryParams]
})

const items = computed(() => data.value?.items || [])
const resumen = computed(() => data.value?.resumen || {
  totalEntradas: 0,
  totalSalidas: 0,
  balance: 0,
  cantidad: 0
})

function clearFilters() {
  search.value = ''
  tipoFilter.value = 'todos'
  desde.value = ''
  hasta.value = ''
}

// Modal Crear / Editar
const formModalOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)

const decimalRegex = /^\d+(\.\d{1,2})?$/

const formSchema = z.object({
  valor: z.string().trim().superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({ code: 'custom', message: 'El valor es obligatorio' })
      return
    }
    if (val.includes(',')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Usa punto (.) para los decimales, no coma (ej: 15000.50)'
      })
      return
    }
    if (!decimalRegex.test(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Formato inválido. Usa solo números y punto para máximo 2 decimales (ej: 15000.50)'
      })
      return
    }
    if (Number(val) <= 0) {
      ctx.addIssue({ code: 'custom', message: 'El valor debe ser mayor a 0' })
    }
  }),
  esEntrada: z.boolean(),
  categoriaDescripcion: z.string().trim().min(1, 'La categoría o descripción es obligatoria').max(255),
  fechaRegistro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de registro es obligatoria'),
  metodoPago: z.string().min(1),
  referencia: z.string().max(100).optional(),
  notas: z.string().max(1000).optional()
})

type CuentaFormSchema = z.output<typeof formSchema>

const formState = reactive<CuentaFormSchema>({
  valor: '',
  esEntrada: false,
  categoriaDescripcion: '',
  fechaRegistro: getTodayISO(),
  metodoPago: 'Efectivo',
  referencia: '',
  notas: ''
})

function openCreateModal() {
  editingId.value = null
  formState.valor = ''
  formState.esEntrada = false
  formState.categoriaDescripcion = ''
  formState.fechaRegistro = getTodayISO()
  formState.metodoPago = 'Efectivo'
  formState.referencia = ''
  formState.notas = ''
  formModalOpen.value = true
}

function openEditModal(item: CuentaDiaria) {
  editingId.value = item.id
  formState.valor = Number.isInteger(item.valor) ? String(item.valor) : item.valor.toFixed(2)
  formState.esEntrada = item.esEntrada
  formState.categoriaDescripcion = item.categoriaDescripcion
  formState.fechaRegistro = item.fechaRegistro
  formState.metodoPago = item.metodoPago || 'Efectivo'
  formState.referencia = item.referencia || ''
  formState.notas = item.notas || ''
  formModalOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<CuentaFormSchema>) {
  saving.value = true
  try {
    const payload = {
      valor: event.data.valor,
      esEntrada: event.data.esEntrada,
      categoriaDescripcion: event.data.categoriaDescripcion,
      fechaRegistro: event.data.fechaRegistro,
      metodoPago: event.data.metodoPago,
      referencia: event.data.referencia || null,
      notas: event.data.notas || null
    }

    if (editingId.value) {
      await $fetch(`/api/cuentas/diarias/${editingId.value}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({
        title: 'Registro actualizado',
        description: 'Los cambios fueron guardados correctamente.',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } else {
      await $fetch('/api/cuentas/diarias', {
        method: 'POST',
        body: payload
      })
      toast.add({
        title: 'Registro creado',
        description: 'Tu movimiento diario ha sido guardado.',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }

    formModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
    toast.add({
      title: 'No se pudo guardar',
      description: e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'Error inesperado',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

// Modal Eliminar
const deleteModalOpen = ref(false)
const deletingItem = ref<CuentaDiaria | null>(null)
const deleting = ref(false)

function openDeleteModal(item: CuentaDiaria) {
  deletingItem.value = item
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await $fetch(`/api/cuentas/diarias/${deletingItem.value.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Registro eliminado',
      description: 'El movimiento fue eliminado correctamente.',
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
    deleteModalOpen.value = false
    deletingItem.value = null
    await refresh()
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
    toast.add({
      title: 'Error al eliminar',
      description: e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'Error inesperado',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

const tipoOptions = [
  { label: 'Todos', value: 'todos' },
  { label: 'Solo Entradas', value: 'entrada' },
  { label: 'Solo Salidas', value: 'salida' }
]
</script>

<template>
  <UDashboardPanel id="cuentas-diarias">
    <template #header>
      <UDashboardNavbar title="Cuentas Diarias">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Nuevo registro"
            icon="i-lucide-plus"
            size="sm"
            @click="openCreateModal"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-5">
        <!-- Reseña en el encabezado de la vista sobre el formato de decimales -->
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="Formato de decimales para el campo Valor"
          description="Ingresa los decimales utilizando PUNTO (.) y sin separadores de miles. Ejemplo: 15000.50 para quince mil con cincuenta centavos. Solo ves y gestionas tus propios registros, ordenados del más reciente al más antiguo."
        />

        <!-- Tarjetas de resumen -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <UCard :ui="{ body: 'p-3.5 sm:p-5' }">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-medium text-muted uppercase">Entradas</span>
              <UIcon name="i-lucide-arrow-down-left" class="size-4 text-success shrink-0" />
            </div>
            <p class="mt-1.5 text-lg sm:text-2xl font-bold text-success tabular-nums truncate">
              {{ formatMoney(resumen.totalEntradas) }}
            </p>
          </UCard>

          <UCard :ui="{ body: 'p-3.5 sm:p-5' }">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-medium text-muted uppercase">Salidas</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-4 text-error shrink-0" />
            </div>
            <p class="mt-1.5 text-lg sm:text-2xl font-bold text-error tabular-nums truncate">
              {{ formatMoney(resumen.totalSalidas) }}
            </p>
          </UCard>

          <UCard :ui="{ body: 'p-3.5 sm:p-5' }">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-medium text-muted uppercase">Balance</span>
              <UIcon name="i-lucide-scale" class="size-4 text-primary shrink-0" />
            </div>
            <p
              class="mt-1.5 text-lg sm:text-2xl font-bold tabular-nums truncate"
              :class="resumen.balance >= 0 ? 'text-highlighted' : 'text-error'"
            >
              {{ formatMoney(resumen.balance) }}
            </p>
          </UCard>

          <UCard :ui="{ body: 'p-3.5 sm:p-5' }">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-medium text-muted uppercase">Registros</span>
              <UIcon name="i-lucide-list" class="size-4 text-muted shrink-0" />
            </div>
            <p class="mt-1.5 text-lg sm:text-2xl font-bold text-highlighted tabular-nums">
              {{ resumen.cantidad }}
            </p>
          </UCard>
        </div>

        <!-- Barra de filtros responsiva -->
        <UCard :ui="{ body: 'p-3.5 sm:p-4' }">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div class="lg:col-span-4">
              <UFormField label="Buscar">
                <UInput
                  v-model="search"
                  icon="i-lucide-search"
                  placeholder="Categoría, descripción, método..."
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="lg:col-span-2">
              <UFormField label="Tipo">
                <USelect
                  v-model="tipoFilter"
                  :items="tipoOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="lg:col-span-2">
              <UFormField label="Desde">
                <UInput v-model="desde" type="date" class="w-full" />
              </UFormField>
            </div>

            <div class="lg:col-span-2">
              <UFormField label="Hasta">
                <UInput v-model="hasta" type="date" class="w-full" />
              </UFormField>
            </div>

            <div class="lg:col-span-2 flex gap-2">
              <UButton
                label="Limpiar"
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="subtle"
                block
                @click="clearFilters"
              />
            </div>
          </div>
        </UCard>

        <!-- Estado de carga / vacio -->
        <UCard v-if="status === 'pending' && !items.length">
          <div class="py-10 text-center text-sm text-muted">
            Cargando tus cuentas diarias...
          </div>
        </UCard>

        <UCard v-else-if="!items.length">
          <div class="py-10 text-center space-y-3">
            <UIcon name="i-lucide-wallet" class="size-10 text-dimmed mx-auto" />
            <div>
              <p class="font-medium text-highlighted">
                No hay movimientos para mostrar
              </p>
              <p class="text-sm text-muted">
                Registra tu primera entrada o salida diaria haciendo clic en "Nuevo registro".
              </p>
            </div>
            <UButton
              label="Nuevo registro"
              icon="i-lucide-plus"
              @click="openCreateModal"
            />
          </div>
        </UCard>

        <template v-else>
          <!-- Vista Movil: Tarjetas apiladas -->
          <div class="space-y-3 md:hidden">
            <UCard
              v-for="item in items"
              :key="item.id"
              :ui="{ body: 'p-4' }"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <UBadge
                      :label="item.esEntrada ? 'Entrada' : 'Salida'"
                      :color="item.esEntrada ? 'success' : 'error'"
                      variant="subtle"
                      size="xs"
                    />
                    <span class="text-xs text-muted">
                      {{ formatDateShort(item.fechaRegistro) }}
                    </span>
                    <span class="text-xs text-muted">
                      · {{ item.metodoPago }}
                    </span>
                  </div>
                  <p class="font-semibold text-highlighted break-words">
                    {{ item.categoriaDescripcion }}
                  </p>
                  <p v-if="item.referencia" class="text-xs text-muted">
                    Ref: {{ item.referencia }}
                  </p>
                  <p v-if="item.notas" class="text-xs text-muted break-words">
                    {{ item.notas }}
                  </p>
                </div>

                <div class="text-right shrink-0">
                  <p
                    class="font-bold text-base tabular-nums"
                    :class="item.esEntrada ? 'text-success' : 'text-error'"
                  >
                    {{ item.esEntrada ? '+' : '-' }} {{ formatMoney(item.valor) }}
                  </p>
                </div>
              </div>

              <div class="mt-3 pt-2.5 border-t border-default flex items-center justify-between gap-2">
                <span class="text-[11px] text-dimmed">
                  Actualizado: {{ formatDateTime(item.actualizadoEn) }}
                </span>
                <div class="flex items-center gap-1.5">
                  <UButton
                    label="Editar"
                    icon="i-lucide-pencil"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    @click="openEditModal(item)"
                  />
                  <UButton
                    label="Borrar"
                    icon="i-lucide-trash-2"
                    size="xs"
                    color="error"
                    variant="subtle"
                    @click="openDeleteModal(item)"
                  />
                </div>
              </div>
            </UCard>
          </div>

          <!-- Vista Escritorio: Tabla completa -->
          <UCard class="hidden md:block" :ui="{ body: 'p-0' }">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-default bg-elevated/40 text-left text-xs uppercase text-muted">
                  <tr>
                    <th class="px-4 py-3 font-medium">
                      Fecha
                    </th>
                    <th class="px-4 py-3 font-medium">
                      Tipo
                    </th>
                    <th class="px-4 py-3 font-medium">
                      Categoría / Descripción
                    </th>
                    <th class="px-4 py-3 font-medium">
                      Método de pago
                    </th>
                    <th class="px-4 py-3 font-medium text-right">
                      Valor
                    </th>
                    <th class="px-4 py-3 font-medium text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="item in items"
                    :key="item.id"
                    class="hover:bg-elevated/30 transition-colors"
                  >
                    <td class="px-4 py-3 whitespace-nowrap font-medium text-default">
                      {{ formatDateShort(item.fechaRegistro) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <UBadge
                        :label="item.esEntrada ? 'Entrada' : 'Salida'"
                        :color="item.esEntrada ? 'success' : 'error'"
                        :icon="item.esEntrada ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'"
                        variant="subtle"
                      />
                    </td>
                    <td class="px-4 py-3">
                      <p class="font-medium text-highlighted">
                        {{ item.categoriaDescripcion }}
                      </p>
                      <p v-if="item.referencia || item.notas" class="text-xs text-muted mt-0.5">
                        <span v-if="item.referencia">Ref: {{ item.referencia }}</span>
                        <span v-if="item.referencia && item.notas"> · </span>
                        <span v-if="item.notas">{{ item.notas }}</span>
                      </p>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-muted">
                      {{ item.metodoPago }}
                    </td>
                    <td
                      class="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums"
                      :class="item.esEntrada ? 'text-success' : 'text-error'"
                    >
                      {{ item.esEntrada ? '+' : '-' }} {{ formatMoney(item.valor) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right">
                      <div class="inline-flex items-center gap-1">
                        <UButton
                          icon="i-lucide-pencil"
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          aria-label="Editar registro"
                          @click="openEditModal(item)"
                        />
                        <UButton
                          icon="i-lucide-trash-2"
                          size="xs"
                          color="error"
                          variant="ghost"
                          aria-label="Eliminar registro"
                          @click="openDeleteModal(item)"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </template>
      </div>

      <!-- Modal Crear / Editar Registro -->
      <UModal
        v-model:open="formModalOpen"
        :title="editingId ? 'Editar registro diario' : 'Nuevo registro diario'"
        description="Los campos marcados con * son obligatorios. Usa punto (.) para decimales."
      >
        <template #body>
          <UForm
            :schema="formSchema"
            :state="formState"
            class="space-y-4"
            @submit="onSubmit"
          >
            <!-- Check de Entrada / Salida -->
            <div class="rounded-lg border border-default p-3.5 bg-elevated/30 flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-highlighted">
                  Tipo de movimiento *
                </p>
                <p class="text-xs text-muted">
                  {{ formState.esEntrada ? 'Marcado: Entrada (ingreso de dinero)' : 'Desmarcado: Salida (gasto o egreso)' }}
                </p>
              </div>
              <div class="flex items-center gap-2.5 shrink-0">
                <UBadge
                  :label="formState.esEntrada ? 'Entrada' : 'Salida'"
                  :color="formState.esEntrada ? 'success' : 'error'"
                  variant="subtle"
                />
                <UCheckbox
                  v-model="formState.esEntrada"
                  aria-label="Es entrada de dinero"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField
                label="Valor"
                name="valor"
                hint="Decimales con punto (.)"
                required
              >
                <UInput
                  v-model="formState.valor"
                  inputmode="decimal"
                  placeholder="Ej: 25000.50"
                  icon="i-lucide-dollar-sign"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Fecha de registro"
                name="fechaRegistro"
                required
              >
                <UInput
                  v-model="formState.fechaRegistro"
                  type="date"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField
              label="Categoría o descripción"
              name="categoriaDescripcion"
              required
            >
              <UInput
                v-model="formState.categoriaDescripcion"
                placeholder="Ej: Almuerzo, Pago de nómina, Transporte..."
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Método de pago" name="metodoPago">
                <USelect
                  v-model="formState.metodoPago"
                  :items="metodosPago"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Referencia / Comprobante" name="referencia" hint="Opcional">
                <UInput
                  v-model="formState.referencia"
                  placeholder="Ej: Factura #1024"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Notas / Observaciones" name="notas" hint="Opcional">
              <UTextarea
                v-model="formState.notas"
                placeholder="Detalles adicionales..."
                :rows="2"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                label="Cancelar"
                color="neutral"
                variant="subtle"
                @click="formModalOpen = false"
              />
              <UButton
                :label="editingId ? 'Guardar cambios' : 'Registrar'"
                icon="i-lucide-check"
                type="submit"
                :loading="saving"
              />
            </div>
          </UForm>
        </template>
      </UModal>

      <!-- Modal Confirmar Eliminacion -->
      <UModal
        v-model:open="deleteModalOpen"
        title="Eliminar registro"
        description="Esta acción no se puede deshacer."
      >
        <template #body>
          <div v-if="deletingItem" class="space-y-4">
            <p class="text-sm text-default">
              ¿Seguro que deseas eliminar el registro
              <span class="font-semibold text-highlighted">"{{ deletingItem.categoriaDescripcion }}"</span>
              por valor de
              <span class="font-semibold" :class="deletingItem.esEntrada ? 'text-success' : 'text-error'">
                {{ formatMoney(deletingItem.valor) }}
              </span>?
            </p>

            <div class="flex justify-end gap-2">
              <UButton
                label="Cancelar"
                color="neutral"
                variant="subtle"
                @click="deleteModalOpen = false"
              />
              <UButton
                label="Sí, eliminar"
                icon="i-lucide-trash-2"
                color="error"
                :loading="deleting"
                @click="confirmDelete"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
