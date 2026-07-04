<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Question {
  id: string
  order: number
  type: string
  text: string
}

interface LessonDetail {
  id: string
  title: string
  subject: string
  grade: string
  questions: Question[]
}

const { t } = useI18n()
const route = useRoute()
const token = useCookie('token')

const { data: lesson, error } = await useAsyncData(`lesson-${route.params.id}`, () =>
  $fetch<LessonDetail>(`/api/lessons/${route.params.id}`, {
    headers: { Authorization: `Bearer ${token.value}` },
  }),
)
if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: 'Không tìm thấy bài học' })
}

async function remove() {
  await $fetch(`/api/lessons/${lesson.value!.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token.value}` },
  })
  await navigateTo('/lessons')
}
</script>

<template>
  <main class="max-w-2xl mx-auto p-6">
    <NuxtLink to="/lessons" class="text-moss text-sm">{{ t('lessons.back') }}</NuxtLink>
    <div class="flex items-center justify-between mt-2 mb-6">
      <div>
        <h1 class="text-3xl">{{ lesson.title }}</h1>
        <p class="text-stone text-sm">{{ lesson.subject }} · {{ t('lessons.grade') }} {{ lesson.grade }}</p>
      </div>
      <UButton color="error" variant="ghost" @click="remove">{{ t('lessons.delete') }}</UButton>
    </div>

    <p v-if="lesson.questions.length === 0" class="text-stone">{{ t('lessons.noQuestions') }}</p>
    <ol v-else class="flex flex-col gap-2">
      <li
        v-for="(q, i) in lesson.questions"
        :key="q.id"
        class="flex items-center gap-3 p-3 rounded-xl bg-linen border border-black/10"
      >
        <span class="font-mono text-sm text-stone">{{ i + 1 }}</span>
        <span class="flex-1">{{ q.text }}</span>
        <span class="text-xs text-stone">{{ q.type === 'mcq' ? 'Trắc nghiệm' : 'Đúng-Sai' }}</span>
      </li>
    </ol>
  </main>
</template>
