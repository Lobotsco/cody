<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { user } = useAuth()
const open = ref(false)

const navItems = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = [
    {
      label: 'Inicio',
      icon: 'i-lucide-house',
      to: '/',
      exact: true,
      onSelect: () => {
        open.value = false
      }
    }
  ]

  const menus = user.value?.menus || []
  for (const parent of menus) {
    if (!parent.hijos.length) continue
    items.push({
      label: parent.nombre,
      icon: parent.icono || 'i-lucide-folder',
      defaultOpen: true,
      type: 'trigger',
      children: parent.hijos.map(hijo => ({
        label: hijo.nombre,
        icon: hijo.icono || 'i-lucide-chevron-right',
        to: hijo.ruta,
        onSelect: () => {
          open.value = false
        }
      }))
    })
  }

  return items
})

const searchGroups = computed(() => {
  const flatItems: Array<{ id: string, label: string, icon?: string, to?: string }> = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: 'i-lucide-house',
      to: '/'
    }
  ]

  for (const parent of user.value?.menus || []) {
    for (const hijo of parent.hijos) {
      flatItems.push({
        id: hijo.codigo,
        label: `${parent.nombre} / ${hijo.nombre}`,
        icon: hijo.icono || 'i-lucide-chevron-right',
        to: hijo.ruta
      })
    }
  }

  return [{
    id: 'links',
    label: 'Ir a',
    items: flatItems
  }]
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/"
          class="flex items-center gap-2.5 px-1.5 py-1 min-w-0"
          @click="open = false"
        >
          <div class="flex items-center justify-center size-8 rounded-lg bg-primary text-inverted shrink-0">
            <UIcon name="i-lucide-wallet" class="size-4.5" />
          </div>
          <div v-if="!collapsed" class="min-w-0">
            <p class="font-semibold text-highlighted leading-tight truncate">
              Cody
            </p>
            <p class="text-xs text-muted truncate">
              Cuentas Diarias
            </p>
          </div>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          label="Buscar..."
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" placeholder="Buscar opción..." />

    <slot />
  </UDashboardGroup>
</template>
