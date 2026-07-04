<script setup lang="ts">
interface PublicAssignment {
  title: string
  subject: string
  questionCount: number
}

const route = useRoute()
const { t } = useI18n()
const assignmentId = route.query.a as string | undefined
const previewLessonId = route.query.lesson as string | undefined
const isPreview = !!previewLessonId

const { data: assignment, error } = await useAsyncData(`play-${assignmentId ?? previewLessonId}`, () => {
  if (isPreview) {
    return useApi<{ title: string; subject: string; questions: unknown[] }>(`/api/lessons/${previewLessonId}`).then(
      (l) => ({ title: l.title, subject: l.subject, questionCount: l.questions.length }),
    )
  }
  return useApi<PublicAssignment>(`/api/assignments/${assignmentId}/public`)
})

const name = ref('')
const studentNumber = ref('')
const busy = ref(false)
const enterError = ref('')
const entered = ref(false)

const canStart = computed(() => name.value.trim() !== '' && studentNumber.value.trim() !== '')

async function start() {
  if (isPreview) {
    entered.value = true
    return
  }
  busy.value = true
  enterError.value = ''
  try {
    const { accessToken } = await useApi<{ accessToken: string }>(`/api/assignments/${assignmentId}/enter`, {
      method: 'POST',
      body: { name: name.value, studentNumber: studentNumber.value },
    })
    sessionStorage.setItem('gameToken', accessToken)
    entered.value = true
  } catch (e: any) {
    enterError.value = e.data?.message ?? t('auth.failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <UCard v-if="error" class="w-full max-w-sm">
      <p class="text-stone">{{ t('play.notFound') }}</p>
    </UCard>
    <UCard v-else-if="entered" class="w-full max-w-sm">
      <p class="text-2xl text-center">{{ t('play.getReady') }}</p>
    </UCard>
    <UCard v-else class="w-full max-w-sm">
      <form class="flex flex-col gap-4" @submit.prevent="start">
        <div>
          <UBadge v-if="isPreview" color="warning" variant="subtle" class="mb-1">{{ t('play.previewBadge') }}</UBadge>
          <h1 class="text-2xl">{{ assignment!.title }}</h1>
          <p class="text-stone text-sm">
            {{ assignment!.subject }} · {{ assignment!.questionCount }} {{ t('lessons.questions') }}
          </p>
        </div>
        <UFormField :label="t('play.name')">
          <UInput v-model="name" class="w-full" required />
        </UFormField>
        <UFormField :label="t('play.studentNumber')">
          <UInput v-model="studentNumber" class="w-full" required />
        </UFormField>
        <p v-if="enterError" class="text-red-600 text-sm">{{ enterError }}</p>
        <UButton type="submit" block :loading="busy" :disabled="!canStart">{{ t('play.start') }}</UButton>
      </form>
    </UCard>
  </main>
</template>
