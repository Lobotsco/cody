<script setup lang="ts">
import type { CuentasDiariasResponse } from '~/types'

const { user, hasMenu } = useAuth()

const canSeeDiarias = computed(() => hasMenu('CUENTAS_DIARIAS'))

const { data: cuentasData, status: cuentasStatus } = await useFetch<CuentasDiariasResponse>(
  '/api/cuentas/diarias',
  {
    immediate: canSeeDiarias.value,
    watch: [canSeeDiarias]
  }
)

const recentItems = computed(() => (cuentasData.value?.items || []).slice(0, 5))
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Inicio">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="canSeeDiarias"
            label="Ir a Cuentas Diarias"
            icon="i-lucide-plus"
            to="/cuentas/diarias"
            size="sm"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 class="text-xl font-semibold text-highlighted">
              Hola, {{ user?.nombreCompleto }}
            </h2>
            <p class="text-sm text-muted">
              Rol activo: <span class="font-medium text-default">{{ user?.rolNombre }}</span>
            </p>
          </div>
        </div>

        <!-- Resumen financiero personal si tiene acceso a Cuentas Diarias -->
        <div v-if="canSeeDiarias" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UCard>
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Entradas
              </p>
              <UIcon name="i-lucide-arrow-down-left" class="size-4 text-success" />
            </div>
            <p class="mt-2 text-2xl font-bold text-success">
              {{ formatMoney(cuentasData?.resumen.totalEntradas || 0) }}
            </p>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Salidas
              </p>
              <UIcon name="i-lucide-arrow-up-right" class="size-4 text-error" />
            </div>
            <p class="mt-2 text-2xl font-bold text-error">
              {{ formatMoney(cuentasData?.resumen.totalSalidas || 0) }}
            </p>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Balance
              </p>
              <UIcon name="i-lucide-scale" class="size-4 text-primary" />
            </div>
            <p
              class="mt-2 text-2xl font-bold"
              :class="(cuentasData?.resumen.balance || 0) >= 0 ? 'text-highlighted' : 'text-error'"
            >
              {{ formatMoney(cuentasData?.resumen.balance || 0) }}
            </p>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Movimientos
              </p>
              <UIcon name="i-lucide-receipt" class="size-4 text-muted" />
            </div>
            <p class="mt-2 text-2xl font-bold text-highlighted">
              {{ cuentasData?.resumen.cantidad || 0 }}
            </p>
          </UCard>
        </div>

        <!-- Accesos rapidos segun menu asignado -->
        <div>
          <h3 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Tus módulos disponibles
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <template v-for="parent in user?.menus || []" :key="parent.id">
              <NuxtLink
                v-for="hijo in parent.hijos"
                :key="hijo.id"
                :to="hijo.ruta"
                class="block group"
              >
                <UCard class="h-full transition-colors group-hover:bg-elevated/60">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary shrink-0">
                      <UIcon :name="hijo.icono || 'i-lucide-arrow-right'" class="size-5" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs text-muted">
                        {{ parent.nombre }}
                      </p>
                      <p class="font-semibold text-highlighted truncate">
                        {{ hijo.nombre }}
                      </p>
                    </div>
                    <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed ms-auto shrink-0" />
                  </div>
                </UCard>
              </NuxtLink>
            </template>
          </div>
        </div>

        <!-- Ultimos movimientos personales -->
        <UCard v-if="canSeeDiarias">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-semibold text-highlighted">
                Últimos movimientos registrados
              </h3>
              <UButton
                label="Ver todos"
                variant="ghost"
                color="neutral"
                size="xs"
                trailing-icon="i-lucide-arrow-right"
                to="/cuentas/diarias"
              />
            </div>
          </template>

          <div v-if="cuentasStatus === 'pending'" class="py-6 text-center text-sm text-muted">
            Cargando movimientos...
          </div>

          <div v-else-if="!recentItems.length" class="py-8 text-center space-y-2">
            <UIcon name="i-lucide-inbox" class="size-8 text-dimmed mx-auto" />
            <p class="text-sm text-muted">
              Aún no tienes movimientos registrados.
            </p>
            <UButton
              label="Registrar mi primer movimiento"
              size="sm"
              to="/cuentas/diarias"
            />
          </div>

          <div v-else class="divide-y divide-default">
            <div
              v-for="item in recentItems"
              :key="item.id"
              class="py-3 flex items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <p class="font-medium text-highlighted truncate">
                  {{ item.categoriaDescripcion }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDateShort(item.fechaRegistro) }} · {{ item.metodoPago }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p
                  class="font-semibold tabular-nums"
                  :class="item.esEntrada ? 'text-success' : 'text-error'"
                >
                  {{ item.esEntrada ? '+' : '-' }} {{ formatMoney(item.valor) }}
                </p>
                <UBadge
                  :label="item.esEntrada ? 'Entrada' : 'Salida'"
                  :color="item.esEntrada ? 'success' : 'error'"
                  variant="subtle"
                  size="xs"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
