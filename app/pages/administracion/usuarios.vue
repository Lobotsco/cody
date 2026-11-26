<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AdminRol, AdminUsuario } from '~/types'

const toast = useToast()

const { data: usuarios, status, refresh } = await useFetch<AdminUsuario[]>('/api/admin/usuarios')
const { data: roles } = await useFetch<AdminRol[]>('/api/admin/roles')

const roleOptions = computed(() =>
  (roles.value || []).map(r => ({
    label: r.nombre,
    value: r.id
  }))
)

const modalOpen = ref(false)
const editingUser = ref<AdminUsuario | null>(null)
const saving = ref(false)
const togglingId = ref<number | null>(null)

const createSchema = z.object({
  username: z.string().trim().min(3, 'Mínimo 3 caracteres').max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, puntos y guiones'),
  nombreCompleto: z.string().trim().min(2, 'Nombre obligatorio').max(150),
  email: z.string().trim().email('Correo inválido').optional().or(z.literal('')),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(128),
  rolId: z.coerce.number().int().positive('Selecciona un rol')
})

const editSchema = z.object({
  username: z.string().trim().min(1),
  nombreCompleto: z.string().trim().min(2, 'Nombre obligatorio').max(150),
  email: z.string().trim().email('Correo inválido').optional().or(z.literal('')),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(128).optional().or(z.literal('')),
  rolId: z.coerce.number().int().positive('Selecciona un rol')
})

const activeSchema = computed(() => editingUser.value ? editSchema : createSchema)

const formState = reactive({
  username: '',
  nombreCompleto: '',
  email: '',
  password: '',
  rolId: 0
})

function openCreateModal() {
  editingUser.value = null
  formState.username = ''
  formState.nombreCompleto = ''
  formState.email = ''
  formState.password = ''
  formState.rolId = roleOptions.value[0]?.value || 0
  modalOpen.value = true
}

function openEditModal(u: AdminUsuario) {
  editingUser.value = u
  formState.username = u.username
  formState.nombreCompleto = u.nombreCompleto
  formState.email = u.email || ''
  formState.password = ''
  formState.rolId = u.rolId
  modalOpen.value = true
}

type UserFormPayload = z.output<typeof createSchema> | z.output<typeof editSchema>

async function onSubmit(event: FormSubmitEvent<UserFormPayload>) {
  saving.value = true
  try {
    if (editingUser.value) {
      await $fetch(`/api/admin/usuarios/${editingUser.value.id}`, {
        method: 'PUT',
        body: {
          nombreCompleto: event.data.nombreCompleto,
          email: event.data.email || null,
          rolId: event.data.rolId,
          password: event.data.password || ''
        }
      })
      toast.add({
        title: 'Usuario actualizado',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } else {
      await $fetch('/api/admin/usuarios', {
        method: 'POST',
        body: {
          username: event.data.username,
          nombreCompleto: event.data.nombreCompleto,
          email: event.data.email || null,
          password: event.data.password,
          rolId: event.data.rolId
        }
      })
      toast.add({
        title: 'Usuario creado',
        description: `El usuario @${event.data.username} fue creado correctamente.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }

    modalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
    toast.add({
      title: 'No se pudo guardar el usuario',
      description: e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'Error inesperado',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

async function toggleBloqueo(u: AdminUsuario) {
  if (u.esAdmin || u.esAdminPrincipal) return
  togglingId.value = u.id
  try {
    const nuevoEstado = !u.bloqueado
    await $fetch(`/api/admin/usuarios/${u.id}/bloqueo`, {
      method: 'PATCH',
      body: { bloqueado: nuevoEstado }
    })
    toast.add({
      title: nuevoEstado ? 'Usuario bloqueado' : 'Usuario desbloqueado',
      description: nuevoEstado
        ? `@${u.username} ya no podrá acceder a la aplicación.`
        : `@${u.username} tiene acceso habilitado nuevamente.`,
      color: nuevoEstado ? 'warning' : 'success',
      icon: nuevoEstado ? 'i-lucide-lock' : 'i-lucide-unlock'
    })
    await refresh()
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
    toast.add({
      title: 'Acción no permitida',
      description: e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'Error inesperado',
      color: 'error'
    })
  } finally {
    togglingId.value = null
  }
}
</script>

<template>
  <UDashboardPanel id="admin-usuarios">
    <template #header>
      <UDashboardNavbar title="Administración — Usuarios">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Nuevo usuario"
            icon="i-lucide-user-plus"
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
          icon="i-lucide-shield-check"
          title="Gestión de acceso de usuarios"
          description="Crea usuarios, asígnales un rol y bloquea o desbloquea su acceso en cualquier momento. Los usuarios con rol Administrador están protegidos y no pueden ser bloqueados."
        />

        <UCard v-if="status === 'pending' && !usuarios?.length">
          <div class="py-10 text-center text-sm text-muted">
            Cargando usuarios...
          </div>
        </UCard>

        <template v-else>
          <!-- Vista Movil -->
          <div class="space-y-3 md:hidden">
            <UCard
              v-for="u in usuarios || []"
              :key="u.id"
              :ui="{ body: 'p-4' }"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-semibold text-highlighted truncate">
                    {{ u.nombreCompleto }}
                  </p>
                  <p class="text-xs text-muted">
                    @{{ u.username }}<span v-if="u.email"> · {{ u.email }}</span>
                  </p>
                </div>
                <UBadge
                  :label="u.bloqueado ? 'Bloqueado' : 'Activo'"
                  :color="u.bloqueado ? 'error' : 'success'"
                  variant="subtle"
                  size="xs"
                />
              </div>

              <div class="mt-2.5 flex items-center gap-2 flex-wrap">
                <UBadge
                  :label="u.rolNombre"
                  :color="u.esAdmin ? 'primary' : 'neutral'"
                  variant="soft"
                  size="xs"
                />
                <span class="text-xs text-muted">
                  Último acceso: {{ formatDateTime(u.ultimoAcceso) }}
                </span>
              </div>

              <div class="mt-3 pt-2.5 border-t border-default flex items-center justify-end gap-2">
                <UButton
                  label="Editar"
                  icon="i-lucide-pencil"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  @click="openEditModal(u)"
                />
                <UBadge
                  v-if="u.esAdmin || u.esAdminPrincipal"
                  label="Protegido"
                  icon="i-lucide-shield"
                  color="primary"
                  variant="subtle"
                />
                <UButton
                  v-else
                  :label="u.bloqueado ? 'Desbloquear' : 'Bloquear'"
                  :icon="u.bloqueado ? 'i-lucide-unlock' : 'i-lucide-lock'"
                  :color="u.bloqueado ? 'success' : 'error'"
                  variant="subtle"
                  size="xs"
                  :loading="togglingId === u.id"
                  @click="toggleBloqueo(u)"
                />
              </div>
            </UCard>
          </div>

          <!-- Vista Escritorio -->
          <UCard class="hidden md:block" :ui="{ body: 'p-0' }">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-default bg-elevated/40 text-left text-xs uppercase text-muted">
                  <tr>
                    <th class="px-4 py-3 font-medium">
                      Usuario
                    </th>
                    <th class="px-4 py-3 font-medium">
                      Rol
                    </th>
                    <th class="px-4 py-3 font-medium">
                      Estado
                    </th>
                    <th class="px-4 py-3 font-medium">
                      Último acceso
                    </th>
                    <th class="px-4 py-3 font-medium text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr
                    v-for="u in usuarios || []"
                    :key="u.id"
                    class="hover:bg-elevated/30 transition-colors"
                  >
                    <td class="px-4 py-3">
                      <p class="font-medium text-highlighted">
                        {{ u.nombreCompleto }}
                      </p>
                      <p class="text-xs text-muted">
                        @{{ u.username }}<span v-if="u.email"> · {{ u.email }}</span>
                      </p>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <UBadge
                        :label="u.rolNombre"
                        :color="u.esAdmin ? 'primary' : 'neutral'"
                        variant="subtle"
                      />
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <UBadge
                        :label="u.bloqueado ? 'Bloqueado' : 'Activo'"
                        :color="u.bloqueado ? 'error' : 'success'"
                        variant="subtle"
                      />
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-muted text-xs">
                      {{ formatDateTime(u.ultimoAcceso) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right">
                      <div class="inline-flex items-center gap-1.5">
                        <UButton
                          label="Editar"
                          icon="i-lucide-pencil"
                          size="xs"
                          color="neutral"
                          variant="subtle"
                          @click="openEditModal(u)"
                        />
                        <UBadge
                          v-if="u.esAdmin || u.esAdminPrincipal"
                          label="Protegido"
                          icon="i-lucide-shield"
                          color="primary"
                          variant="subtle"
                        />
                        <UButton
                          v-else
                          :label="u.bloqueado ? 'Desbloquear' : 'Bloquear'"
                          :icon="u.bloqueado ? 'i-lucide-unlock' : 'i-lucide-lock'"
                          :color="u.bloqueado ? 'success' : 'error'"
                          variant="subtle"
                          size="xs"
                          :loading="togglingId === u.id"
                          @click="toggleBloqueo(u)"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </template>

        <AppFooter />
      </div>

      <!-- Modal Crear / Editar Usuario -->
      <UModal
        v-model:open="modalOpen"
        :title="editingUser ? `Editar usuario @${editingUser.username}` : 'Crear nuevo usuario'"
        description="Asigna las credenciales y el rol de acceso del usuario."
      >
        <template #body>
          <UForm
            :schema="activeSchema"
            :state="formState"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              v-if="!editingUser"
              label="Nombre de usuario (login)"
              name="username"
              required
            >
              <UInput
                v-model="formState.username"
                placeholder="Ej: juan.perez"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Nombre completo" name="nombreCompleto" required>
              <UInput
                v-model="formState.nombreCompleto"
                placeholder="Ej: Juan Pérez"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Correo electrónico" name="email" hint="Opcional">
              <UInput
                v-model="formState.email"
                type="email"
                placeholder="Ej: juan@correo.com"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Rol" name="rolId" required>
              <USelect
                v-model="formState.rolId"
                :items="roleOptions"
                value-key="value"
                label-key="label"
                :disabled="Boolean(editingUser?.esAdminPrincipal)"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="editingUser ? 'Nueva contraseña' : 'Contraseña'"
              name="password"
              :hint="editingUser ? 'Déjalo vacío para no cambiarla' : 'Mínimo 6 caracteres'"
              :required="!editingUser"
            >
              <UInput
                v-model="formState.password"
                type="password"
                placeholder="••••••••"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                label="Cancelar"
                color="neutral"
                variant="subtle"
                @click="modalOpen = false"
              />
              <UButton
                :label="editingUser ? 'Guardar cambios' : 'Crear usuario'"
                icon="i-lucide-check"
                type="submit"
                :loading="saving"
              />
            </div>
          </UForm>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
