<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: 'Página no encontrada — Cody',
  description: 'Lo sentimos, la página solicitada no existe.'
})

useHead({
  htmlAttrs: {
    lang: 'es'
  }
})
</script>

<template>
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
