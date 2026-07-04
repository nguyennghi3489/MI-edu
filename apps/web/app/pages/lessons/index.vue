<script setup lang="ts">
// ponytail: placeholder lesson library — real screen (search, filters, cards) lands in #3
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const auth = useAuthStore()

async function logout() {
  auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <main class="max-w-2xl mx-auto p-6">
    <h1 class="text-3xl mb-4">{{ t('lessons.title') }}</h1>
    <p class="text-stone mb-4">{{ t('lessons.empty') }}</p>
    <UButton @click="logout">{{ t('auth.logout') }}</UButton>
  </main>
</template>
