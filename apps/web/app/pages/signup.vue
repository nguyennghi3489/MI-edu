<script setup lang="ts">
const { t } = useI18n()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const name = ref('')
const school = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await auth.signup({
      email: email.value,
      password: password.value,
      name: name.value,
      school: school.value || undefined,
    })
    await navigateTo('/lessons')
  } catch (e: any) {
    const msg = e.data?.message
    error.value = (Array.isArray(msg) ? msg[0] : msg) ?? t('auth.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <h1 class="text-2xl">{{ t('auth.signupTitle') }}</h1>
        <UFormField :label="t('auth.name')">
          <UInput v-model="name" class="w-full" required />
        </UFormField>
        <UFormField :label="t('auth.school')">
          <UInput v-model="school" class="w-full" />
        </UFormField>
        <UFormField :label="t('auth.email')">
          <UInput v-model="email" class="w-full" type="email" required />
        </UFormField>
        <UFormField :label="t('auth.password')">
          <UInput v-model="password" class="w-full" type="password" minlength="6" required />
        </UFormField>
        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
        <UButton type="submit" block :loading="busy">{{ t('auth.signup') }}</UButton>
        <UButton as="a" href="/api/auth/google" variant="ghost" block>{{ t('auth.google') }}</UButton>
        <NuxtLink class="text-moss text-sm text-center" to="/login">{{ t('auth.haveAccount') }}</NuxtLink>
      </form>
    </UCard>
  </main>
</template>
