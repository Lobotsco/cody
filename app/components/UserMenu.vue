<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const appConfig = useAppConfig()
const { user, logout } = useAuth()

const colors = ['green', 'emerald', 'teal', 'blue', 'indigo', 'violet', 'amber', 'rose']

const initials = computed(() => {
  const name = user.value?.nombreCompleto || user.value?.username || 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('')
})

const items = computed<DropdownMenuItem[][]>(() => ([[{
  type: 'label',
  label: user.value?.nombreCompleto || 'Usuario',
  description: user.value ? `@${user.value.username} · ${user.value.rolNombre}` : ''
}], [{
  label: 'Color principal',
  icon: 'i-lucide-palette',
  children: colors.map(color => ({
    label: color,
    chip: color,
    slot: 'chip',
    checked: appConfig.ui.colors.primary === color,
    type: 'checkbox',
    onSelect: (e: Event) => {
      e.preventDefault()
      appConfig.ui.colors.primary = color
    }
  }))
}, {
  label: 'Apariencia',
  icon: 'i-lucide-sun-moon',
  children: [{
    label: 'Claro',
    icon: 'i-lucide-sun',
    type: 'checkbox',
    checked: colorMode.value === 'light',
    onSelect(e: Event) {
      e.preventDefault()
      colorMode.preference = 'light'
    }
  }, {
    label: 'Oscuro',
    icon: 'i-lucide-moon',
    type: 'checkbox',
    checked: colorMode.value === 'dark',
    onSelect(e: Event) {
      e.preventDefault()
      colorMode.preference = 'dark'
    }
  }]
}], [{
  label: 'Cerrar sesión',
  icon: 'i-lucide-log-out',
  color: 'error',
  onSelect: async () => {
    await logout()
  }
}]]))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-52' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated justify-start"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      :ui="{ trailingIcon: 'text-dimmed ms-auto' }"
    >
      <template #leading>
        <UAvatar
          :text="initials"
          size="2xs"
        />
      </template>

      <template v-if="!collapsed" #default>
        <div class="text-left min-w-0">
          <p class="text-sm font-medium text-highlighted truncate leading-tight">
            {{ user?.nombreCompleto || user?.username }}
          </p>
          <p class="text-xs text-muted truncate leading-tight">
            {{ user?.rolNombre }}
          </p>
        </div>
      </template>
    </UButton>

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span
          class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
          :style="{
            '--chip-light': `var(--color-${(item as Record<string, string>).chip}-500)`,
            '--chip-dark': `var(--color-${(item as Record<string, string>).chip}-400)`
          }"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>
