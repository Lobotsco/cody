<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const { login } = useAuth()
const toast = useToast()

const schema = z.object({
  username: z.string().trim().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña')
})

type LoginSchema = z.output<typeof schema>

const state = reactive<LoginSchema>({
  username: '',
  password: ''
})

const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  loading.value = true
  errorMessage.value = ''
  try {
    const loggedUser = await login(event.data.username, event.data.password)
    toast.add({
      title: `Bienvenido, ${loggedUser.nombreCompleto}`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await navigateTo('/')
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
    errorMessage.value = e?.data?.statusMessage || e?.data?.message || e?.statusMessage || 'No se pudo iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard class="w-full max-w-md shadow-lg">
    <template #header>
      <div class="flex flex-col items-center text-center gap-2 py-2">
        <div class="flex items-center justify-center size-12 rounded-xl bg-primary text-inverted shadow-sm">
          <UIcon name="i-lucide-wallet" class="size-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted tracking-tight">
            Cody
          </h1>
          <p class="text-sm text-muted">
            Inicia sesión para gestionar tus cuentas diarias
          </p>
        </div>
      </div>
    </template>

    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="errorMessage"
      />

      <UFormField label="Usuario" name="username" required>
        <UInput
          v-model="state.username"
          placeholder="Ej. admin"
          icon="i-lucide-user"
          autocomplete="username"
          size="lg"
          class="w-full"
          autofocus
        />
      </UFormField>

      <UFormField label="Contraseña" name="password" required>
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Ingresa tu contraseña"
          icon="i-lucide-lock"
          autocomplete="current-password"
          size="lg"
          class="w-full"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UButton
        type="submit"
        label="Ingresar"
        icon="i-lucide-log-in"
        size="lg"
        block
        :loading="loading"
      />
    </UForm>
  </UCard>
</template>
