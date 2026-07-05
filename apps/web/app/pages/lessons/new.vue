<script setup lang="ts">
import { errorMessage } from '~/utils/errorMessage'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

const { t } = useI18n()

const title = ref('')
const subject = ref(SUBJECTS[0].name)
const grade = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    const lesson = await useApi<{ id: string }>('/api/lessons', {
      method: 'POST',
      body: { title: title.value, subject: subject.value, grade: grade.value, gameFormat: 'quiz' },
    })
    await navigateTo(`/lessons/${lesson.id}`)
  } catch (e: any) {
    error.value = errorMessage(e, t)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="max-w-md mx-auto p-6">
    <h1 class="text-2xl mb-4">{{ t('lessons.create') }}</h1>
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <UFormField :label="t('lessons.lessonTitle')">
        <UInput v-model="title" class="w-full" required />
      </UFormField>
      <UFormField :label="t('lessons.subject')">
        <USelect v-model="subject" class="w-full" :items="SUBJECTS.map((s) => s.name)" />
      </UFormField>
      <UFormField :label="t('lessons.grade')">
        <UInput v-model="grade" class="w-full" placeholder="VD: 3" required />
      </UFormField>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      <UButton type="submit" block :loading="busy">{{ t('lessons.create') }}</UButton>
      <NuxtLink class="text-moss text-sm text-center" to="/lessons">{{ t('lessons.cancel') }}</NuxtLink>
    </form>
  </main>
</template>
