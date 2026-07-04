<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

const name = ref('')
const grade = ref('')
const schoolYear = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    const klass = await useApi<{ id: string }>('/api/classes', {
      method: 'POST',
      body: { name: name.value, grade: grade.value || undefined, schoolYear: schoolYear.value || undefined },
    })
    await navigateTo(`/classes/${klass.id}`)
  } catch (e: any) {
    error.value = e.data?.message ?? t('auth.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="max-w-md mx-auto p-6">
    <h1 class="text-2xl mb-4">{{ t('classes.create') }}</h1>
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <UFormField :label="t('classes.name')">
        <UInput v-model="name" class="w-full" required />
      </UFormField>
      <UFormField :label="t('classes.grade')">
        <UInput v-model="grade" class="w-full" placeholder="VD: 3" />
      </UFormField>
      <UFormField :label="t('classes.schoolYear')">
        <UInput v-model="schoolYear" class="w-full" placeholder="VD: 2025-2026" />
      </UFormField>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      <UButton type="submit" block :loading="busy">{{ t('classes.create') }}</UButton>
      <NuxtLink class="text-moss text-sm text-center" to="/classes">{{ t('classes.cancel') }}</NuxtLink>
    </form>
  </main>
</template>
