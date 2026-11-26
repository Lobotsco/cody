<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AdminRol, MenuTreeItem } from '~/types'

const toast = useToast()
const { fetchUser } = useAuth()

const { data: roles, status, refresh } = await useFetch<AdminRol[]>('/api/admin/roles')
const { data: menuTree } = await useFetch<MenuTreeItem[]>('/api/admin/menus')

const modalOpen = ref(false)
const editingRole = ref<AdminRol | null>(null)
const saving = ref(false)

const roleSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del rol es obligatorio').max(100),
  descripcion: z.string().trim().max(255).optional(),
  menuIds: z.array(z.number()).min(1, 'Debes seleccionar al menos una opción de menú hijo')
})

type RoleFormSchema = z.output<typeof roleSchema>

const formState = reactive<RoleFormSchema>({
  nombre: '',
  descripcion: '',
  menuIds: []
})

function openCreateModal() {
  editingRole.value = null
  formState.nombre = ''
  formState.descripcion = ''
  formState.menuIds = []
  modalOpen.value = true
}

function openEditModal(rol: AdminRol) {
  editingRole.value = rol
  formState.nombre = rol.nombre
  formState.descripcion = rol.descripcion || ''
  formState.menuIds = [...rol.menuIds]
  modalOpen.value = true
}

function isMenuSelected(menuId: number): boolean {
  return formState.menuIds.includes(menuId)
}

function toggleMenu(menuId: number, checked: boolean | 'indeterminate') {
  const isChecked = Boolean(checked)
  if (isChecked) {
    if (!formState.menuIds.includes(menuId)) {
      formState.menuIds = [...formState.menuIds, menuId]
    }
  } else {
    formState.menuIds = formState.menuIds.filter(id => id !== menuId)
  }
}

async function onSubmit(event: FormSubmitEvent<RoleFormSchema>) {
  saving.value = true
  try {
    const payload = {
      nombre: event.data.nombre,
      descripcion: event.data.descripcion || null,
      menuIds: event.data.menuIds
    }

    if (editingRole.value) {
      await $fetch(`/api/admin/roles/${editingRole.value.id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({
        title: 'Rol actualizado',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } else {
      await $fetch('/api/admin/roles', {
        method: 'POST',
        body: payload
      })
      toast.add({
        title: 'Rol creado',
        description: `El rol "${event.data.nombre}" se creó con sus accesos asignados.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }

    modalOpen.value = false
    await refresh()
    await fetchUser(true)
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
    toast.add({
      title: 'No se pudo guardar el rol',
      description: e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'Error inesperado',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

// Eliminar rol
const deleteModalOpen = ref(false)
const deletingRole = ref<AdminRol | null>(null)
const deleting = ref(false)

function openDeleteModal(rol: AdminRol) {
  deletingRole.value = rol
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingRole.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/roles/${deletingRole.value.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Rol eliminado',
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
    deleteModalOpen.value = false
    deletingRole.value = null
    await refresh()
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
    toast.add({
      title: 'No se pudo eliminar',
      description: e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'Error inesperado',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="admin-roles">
    <template #header>
      <UDashboardNavbar title="Administración — Roles">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Nuevo rol"
            icon="i-lucide-plus"
            size="sm"
            @click="openCreateModal"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-key-round"
          title="Permisos por opciones de menú hijo"
          description="Al crear o editar un rol, selecciona las opciones de menú hijo a las que tendrá acceso. El menú padre aparecerá automáticamente en la navegación cuando tenga al menos una opción hijo asignada."
        />

        <UCard v-if="status === 'pending' && !roles?.length">
          <div class="py-10 text-center text-sm text-muted">
            Cargando roles...
          </div>
        </UCard>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UCard
            v-for="rol in roles || []"
            :key="rol.id"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-semibold text-highlighted">
                    {{ rol.nombre }}
                  </h3>
                  <UBadge
                    v-if="rol.esAdmin"
                    label="Sistema"
                    color="primary"
                    variant="subtle"
                    size="xs"
                  />
                </div>
                <p class="text-xs text-muted mt-0.5">
                  {{ rol.descripcion || 'Sin descripción' }}
                </p>
              </div>

              <UBadge
                :label="`${rol.usuariosCount} ${rol.usuariosCount === 1 ? 'usuario' : 'usuarios'}`"
                color="neutral"
                variant="soft"
                size="xs"
              />
            </div>

            <div class="mt-4">
              <p class="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                Opciones de menú asignadas
              </p>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="m in rol.menus"
                  :key="m.id"
                  :label="`${m.padreNombre} › ${m.nombre}`"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                />
                <span v-if="!rol.menus.length" class="text-xs text-dimmed">
                  Sin accesos asignados
                </span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-default flex items-center justify-between gap-2">
              <span class="text-[11px] text-dimmed">
                Actualizado por {{ rol.actualizadoPor }}
              </span>
              <div class="flex items-center gap-1.5">
                <UButton
                  label="Editar"
                  icon="i-lucide-pencil"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="openEditModal(rol)"
                />
                <UButton
                  v-if="!rol.esAdmin"
                  label="Eliminar"
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="subtle"
                  :disabled="rol.usuariosCount > 0"
                  @click="openDeleteModal(rol)"
                />
              </div>
            </div>
          </UCard>
        </div>

        <AppFooter />
      </div>

      <!-- Modal Crear / Editar Rol -->
      <UModal
        v-model:open="modalOpen"
        :title="editingRole ? `Editar rol: ${editingRole.nombre}` : 'Crear nuevo rol'"
        description="Define el nombre del rol y selecciona las opciones de menú hijo permitidas."
      >
        <template #body>
          <UForm
            :schema="roleSchema"
            :state="formState"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField label="Nombre del rol" name="nombre" required>
              <UInput
                v-model="formState.nombre"
                placeholder="Ej: Usuario Diario, Auxiliar..."
                class="w-full"
              />
            </UFormField>

            <UFormField label="Descripción" name="descripcion" hint="Opcional">
              <UInput
                v-model="formState.descripcion"
                placeholder="Describe qué puede hacer este rol"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Accesos a opciones de menú (solo opciones hijo)"
              name="menuIds"
              required
            >
              <div class="space-y-3 mt-1">
                <div
                  v-for="parent in menuTree || []"
                  :key="parent.id"
                  class="rounded-lg border border-default p-3 bg-elevated/25"
                >
                  <div class="flex items-center gap-2 mb-2.5">
                    <UIcon :name="parent.icono || 'i-lucide-folder'" class="size-4 text-primary" />
                    <span class="text-sm font-semibold text-highlighted">
                      {{ parent.nombre }}
                    </span>
                    <span class="text-xs text-muted">(Menú padre)</span>
                  </div>

                  <div class="pl-5 space-y-2">
                    <div
                      v-for="hijo in parent.hijos"
                      :key="hijo.id"
                      class="flex items-center justify-between gap-2"
                    >
                      <UCheckbox
                        :model-value="isMenuSelected(hijo.id)"
                        :label="hijo.nombre"
                        @update:model-value="(val) => toggleMenu(hijo.id, val)"
                      />
                      <span class="text-xs text-dimmed font-mono">
                        {{ hijo.ruta }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                label="Cancelar"
                color="neutral"
                variant="subtle"
                @click="modalOpen = false"
              />
              <UButton
                :label="editingRole ? 'Guardar cambios' : 'Crear rol'"
                icon="i-lucide-check"
                type="submit"
                :loading="saving"
              />
            </div>
          </UForm>
        </template>
      </UModal>

      <!-- Modal Eliminar Rol -->
      <UModal
        v-model:open="deleteModalOpen"
        title="Eliminar rol"
        description="Esta acción no se puede deshacer."
      >
        <template #body>
          <div v-if="deletingRole" class="space-y-4">
            <p class="text-sm text-default">
              ¿Deseas eliminar el rol <span class="font-semibold text-highlighted">"{{ deletingRole.nombre }}"</span>?
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
