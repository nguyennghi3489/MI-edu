<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Question {
  id: string
  order: number
  type: 'mcq' | 'true-false'
  text: string
  timeLimitSec: number
  config: { options: string[]; correct: number } | { correct: boolean }
}

interface LessonDetail {
  id: string
  title: string
  subject: string
  grade: string
  questions: Question[]
}

const QUESTION_TYPES = [
  { value: 'mcq' as const, label: 'lessons.mcq', color: '#2563EB', soft: '#DBEAFE' },
  { value: 'true-false' as const, label: 'lessons.trueFalse', color: '#7C3AED', soft: '#EDE9FE' },
]
const TIME_OPTIONS = [10, 20, 30, 60]

const { t } = useI18n()
const route = useRoute()

const { data: lesson, error, refresh } = await useAsyncData(`lesson-${route.params.id}`, () =>
  useApi<LessonDetail>(`/api/lessons/${route.params.id}`),
)
if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: 'Không tìm thấy bài học' })
}

function typeInfo(type: string) {
  return QUESTION_TYPES.find((q) => q.value === type)!
}

async function removeLesson() {
  await useApi(`/api/lessons/${lesson.value!.id}`, { method: 'DELETE' })
  await navigateTo('/lessons')
}

async function removeQuestion(id: string) {
  await useApi(`/api/questions/${id}`, { method: 'DELETE' })
  await refresh()
}

const confirmOpen = ref(false)
const confirmMessage = ref('')
const confirmAction = ref<(() => Promise<void>) | null>(null)

function askConfirm(message: string, action: () => Promise<void>) {
  confirmMessage.value = message
  confirmAction.value = action
  confirmOpen.value = true
}

async function confirmYes() {
  await confirmAction.value?.()
  confirmOpen.value = false
}

// ponytail: up/down buttons instead of drag-and-drop — same reorder endpoint, no DnD library,
// works identically on touch and desktop. Swap for a drag handle if teachers ask for it.
async function move(question: Question, dir: -1 | 1) {
  const questions = lesson.value!.questions
  const index = questions.findIndex((q) => q.id === question.id)
  const newOrder = index + dir
  if (newOrder < 0 || newOrder >= questions.length) return
  await useApi(`/api/questions/${question.id}/order`, {
    method: 'PATCH',
    body: { order: newOrder },
  })
  await refresh()
}

const open = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const newType = ref<'mcq' | 'true-false'>('mcq')
const newText = ref('')
const newOptions = ref(['', '', '', ''])
const newCorrectOption = ref(0)
const newCorrectBool = ref(true)
const newTimeLimit = ref(30)

function resetForm() {
  editingId.value = null
  newType.value = 'mcq'
  newText.value = ''
  newOptions.value = ['', '', '', '']
  newCorrectOption.value = 0
  newCorrectBool.value = true
  newTimeLimit.value = 30
  formError.value = ''
}

function openAdd() {
  resetForm()
  open.value = true
}

function openEdit(q: Question) {
  editingId.value = q.id
  newType.value = q.type
  newText.value = q.text
  newTimeLimit.value = q.timeLimitSec
  if (q.type === 'mcq') {
    const config = q.config as { options: string[]; correct: number }
    newOptions.value = [...config.options]
    newCorrectOption.value = config.correct
  } else {
    newCorrectBool.value = (q.config as { correct: boolean }).correct
  }
  formError.value = ''
  open.value = true
}

async function saveQuestion() {
  formError.value = ''
  const config =
    newType.value === 'mcq'
      ? { options: newOptions.value, correct: newCorrectOption.value }
      : { correct: newCorrectBool.value }
  const body = { type: newType.value, text: newText.value, timeLimitSec: newTimeLimit.value, config }
  saving.value = true
  try {
    if (editingId.value) {
      await useApi(`/api/questions/${editingId.value}`, { method: 'PATCH', body })
    } else {
      await useApi(`/api/lessons/${lesson.value!.id}/questions`, { method: 'POST', body })
    }
    await refresh()
    open.value = false
    resetForm()
  } catch (e: any) {
    formError.value = e.data?.message ?? t('auth.failed')
  } finally {
    saving.value = false
  }
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
      <UButton
        color="error"
        variant="ghost"
        @click="askConfirm(t('lessons.confirmDeleteLesson'), removeLesson)"
      >
        {{ t('lessons.delete') }}
      </UButton>
    </div>

    <UButton class="mb-4" block size="lg" @click="openAdd">{{ t('lessons.addQuestion') }}</UButton>

    <p v-if="lesson.questions.length === 0" class="text-stone">{{ t('lessons.noQuestions') }}</p>
    <ol v-else class="flex flex-col gap-2">
      <li
        v-for="(q, i) in lesson.questions"
        :key="q.id"
        class="flex items-center gap-3 p-3 rounded-xl bg-linen border border-black/10"
      >
        <span class="font-mono text-sm text-stone">{{ i + 1 }}</span>
        <button type="button" class="flex-1 truncate text-left cursor-pointer" @click="openEdit(q)">
          {{ q.text }}
        </button>
        <UBadge :style="{ background: typeInfo(q.type).soft, color: typeInfo(q.type).color }" variant="subtle">
          {{ t(typeInfo(q.type).label) }}
        </UBadge>
        <div class="flex gap-1">
          <UButton
            size="xs"
            variant="ghost"
            :disabled="i === 0"
            :aria-label="t('lessons.moveUp')"
            @click="move(q, -1)"
          >
            ▲
          </UButton>
          <UButton
            size="xs"
            variant="ghost"
            :disabled="i === lesson.questions.length - 1"
            :aria-label="t('lessons.moveDown')"
            @click="move(q, 1)"
          >
            ▼
          </UButton>
          <UButton size="xs" variant="ghost" :aria-label="t('lessons.edit')" @click="openEdit(q)">✏️</UButton>
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            :aria-label="t('lessons.deleteQuestion')"
            @click="askConfirm(t('lessons.confirmDeleteQuestion'), () => removeQuestion(q.id))"
          >
            ✕
          </UButton>
        </div>
      </li>
    </ol>

    <UModal
      v-model:open="open"
      :title="editingId ? t('lessons.editQuestion') : t('lessons.addQuestion')"
      :ui="{ content: 'max-w-4xl', body: 'p-6 sm:p-8', footer: 'p-6 sm:p-8' }"
    >
      <template #body>
        <div class="flex flex-col gap-6">
          <div class="flex gap-3">
            <UButton
              v-for="qt in QUESTION_TYPES"
              :key="qt.value"
              :variant="newType === qt.value ? 'solid' : 'outline'"
              size="lg"
              @click="newType = qt.value"
            >
              {{ t(qt.label) }}
            </UButton>
          </div>

          <UFormField :label="t('lessons.questionText')" size="lg">
            <UTextarea v-model="newText" class="w-full" size="lg" autoresize :rows="2" :maxrows="6" required />
          </UFormField>

          <div v-if="newType === 'mcq'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              v-for="(_, i) in newOptions"
              :key="i"
              :label="`${t('lessons.option')} ${String.fromCharCode(65 + i)}`"
              size="lg"
            >
              <div class="flex items-start gap-3">
                <input v-model="newCorrectOption" type="radio" :value="i" name="correct-option" class="size-5 mt-3" />
                <UTextarea v-model="newOptions[i]" class="w-full" size="lg" autoresize :rows="1" :maxrows="4" required />
              </div>
            </UFormField>
          </div>

          <div v-else class="flex gap-3">
            <UButton :variant="newCorrectBool ? 'solid' : 'outline'" size="lg" @click="newCorrectBool = true">
              {{ t('lessons.true') }}
            </UButton>
            <UButton :variant="!newCorrectBool ? 'solid' : 'outline'" size="lg" @click="newCorrectBool = false">
              {{ t('lessons.false') }}
            </UButton>
          </div>

          <UFormField :label="t('lessons.timeLimit')" size="lg">
            <div class="flex gap-3">
              <UButton
                v-for="opt in TIME_OPTIONS"
                :key="opt"
                :variant="newTimeLimit === opt ? 'solid' : 'outline'"
                size="lg"
                @click="newTimeLimit = opt"
              >
                {{ opt }}s
              </UButton>
            </div>
          </UFormField>

          <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
        </div>
      </template>
      <template #footer>
        <UButton block size="lg" :loading="saving" @click="saveQuestion">{{ t('lessons.save') }}</UButton>
      </template>
    </UModal>

    <UModal v-model:open="confirmOpen" :title="t('lessons.confirmTitle')">
      <template #body>
        <p>{{ confirmMessage }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="outline" @click="confirmOpen = false">{{ t('lessons.cancel') }}</UButton>
          <UButton color="error" @click="confirmYes">{{ t('lessons.confirmYes') }}</UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>

<style scoped>
.card {
  background: var(--color-linen);
  border: 1px solid rgba(58, 46, 38, 0.1);
  border-radius: 14px;
  padding: 1rem 1.25rem;
}
</style>
