<script setup lang="ts">
const { t } = useI18n()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.login({ email: email.value, password: password.value })
    await navigateTo('/lessons')
  } catch (e: any) {
    error.value = e.data?.message ?? t('auth.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <h1 class="text-2xl">{{ t('auth.loginTitle') }}</h1>
        <UFormField :label="t('auth.email')">
          <UInput v-model="email" class="w-full" type="email" required />
        </UFormField>
        <UFormField :label="t('auth.password')">
          <UInput v-model="password" class="w-full" type="password" required />
        </UFormField>
        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
        <UButton type="submit" block :loading="busy">{{ t('auth.login') }}</UButton>
        <UButton as="a" href="/api/auth/google" variant="ghost" block>{{ t('auth.google') }}</UButton>
        <NuxtLink class="text-moss text-sm text-center" to="/signup">{{ t('auth.noAccount') }}</NuxtLink>
      </form>
    </UCard>
  </main>
</template>
