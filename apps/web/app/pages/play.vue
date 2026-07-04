<script setup lang="ts">
import { gradeAnswer, type PlayQuestion } from '~/utils/gradeAnswer'

interface PublicAssignment {
  title: string
  subject: string
  questionCount: number
}

// quiz.com-style pill colors, up to 4 options
const PILL_COLORS = ['bg-emerald-200 text-emerald-950', 'bg-lime-200 text-lime-950', 'bg-amber-200 text-amber-950', 'bg-rose-200 text-rose-950']
const POINTS_PER_CORRECT = 100

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

type Phase = 'entry' | 'quiz' | 'result'
const phase = ref<Phase>('entry')

const canStart = computed(() => name.value.trim() !== '' && studentNumber.value.trim() !== '')

const questions = ref<PlayQuestion[]>([])
const currentIndex = ref(0)
const current = computed(() => questions.value[currentIndex.value])
const answered = ref(false)
const chosen = ref<number | boolean | undefined>(undefined)
const timeLeft = ref(0)
let timerHandle: ReturnType<typeof setInterval> | undefined

const score = ref(0)
const correctCount = ref(0)
const review = ref<{ question: PlayQuestion; correct: boolean }[]>([])
let startedAt = 0
const elapsedSec = ref(0)

const options = computed<{ label: string; value: number | boolean }[]>(() => {
  const q = current.value
  if (!q) return []
  if (q.type === 'true-false') {
    return [
      { label: t('lessons.true'), value: true },
      { label: t('lessons.false'), value: false },
    ]
  }
  return (q.config.options ?? []).map((label, i) => ({ label, value: i }))
})

async function fetchQuestions() {
  if (isPreview) {
    const lesson = await useApi<{ questions: PlayQuestion[] }>(`/api/lessons/${previewLessonId}`)
    return lesson.questions
  }
  const gameToken = sessionStorage.getItem('gameToken')
  return $fetch<PlayQuestion[]>(`/api/assignments/${assignmentId}/questions`, {
    headers: { Authorization: `Bearer ${gameToken}` },
  })
}

async function start() {
  busy.value = true
  enterError.value = ''
  try {
    if (!isPreview) {
      const { accessToken } = await useApi<{ accessToken: string }>(`/api/assignments/${assignmentId}/enter`, {
        method: 'POST',
        body: { name: name.value, studentNumber: studentNumber.value },
      })
      sessionStorage.setItem('gameToken', accessToken)
    }
    questions.value = await fetchQuestions()
    currentIndex.value = 0
    score.value = 0
    correctCount.value = 0
    review.value = []
    startedAt = Date.now()
    phase.value = 'quiz'
    startTimer()
  } catch (e: any) {
    enterError.value = e.data?.message ?? t('auth.failed')
  } finally {
    busy.value = false
  }
}

function startTimer() {
  clearInterval(timerHandle)
  answered.value = false
  chosen.value = undefined
  timeLeft.value = current.value!.timeLimitSec
  timerHandle = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) submitAnswer(undefined)
  }, 1000)
}

function submitAnswer(value: number | boolean | undefined) {
  if (answered.value) return
  answered.value = true
  chosen.value = value
  clearInterval(timerHandle)

  const correct = value !== undefined && gradeAnswer(current.value!, value)
  if (correct) {
    correctCount.value++
    score.value += POINTS_PER_CORRECT
  }
  review.value.push({ question: current.value!, correct })

  setTimeout(next, 900)
}

function next() {
  if (currentIndex.value + 1 < questions.value.length) {
    currentIndex.value++
    startTimer()
  } else {
    elapsedSec.value = Math.round((Date.now() - startedAt) / 1000)
    phase.value = 'result'
  }
}

function playAgain() {
  phase.value = 'quiz'
  currentIndex.value = 0
  score.value = 0
  correctCount.value = 0
  review.value = []
  startedAt = Date.now()
  startTimer()
}

function pillClass(value: number | boolean, i: number) {
  if (!answered.value) return PILL_COLORS[i]
  if (value === current.value!.config.correct) return 'bg-emerald-500 text-white'
  if (value === chosen.value) return 'bg-rose-500 text-white'
  return `${PILL_COLORS[i]} opacity-50`
}

onUnmounted(() => clearInterval(timerHandle))
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <UCard v-if="error" class="w-full max-w-sm">
      <p class="text-stone">{{ t('play.notFound') }}</p>
    </UCard>

    <UCard v-else-if="phase === 'entry'" class="w-full max-w-sm">
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

    <div v-else-if="phase === 'quiz' && current" class="w-full max-w-4xl">
      <div class="h-2 rounded-full bg-slate-800 mb-6 overflow-hidden">
        <div
          class="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
          :style="{ width: `${(timeLeft / current.timeLimitSec) * 100}%` }"
        />
      </div>
      <p class="text-slate-400 text-sm mb-2">
        {{ t('play.question') }} {{ currentIndex + 1 }} {{ t('play.of') }} {{ questions.length }}
      </p>
      <div class="grid gap-6" :class="current.imageUrl ? 'md:grid-cols-2' : ''">
        <div>
          <h2 class="text-2xl text-white mb-6">{{ current.text }}</h2>
          <div class="flex flex-col gap-3">
            <button
              v-for="(opt, i) in options"
              :key="i"
              type="button"
              class="rounded-2xl px-6 py-4 text-lg font-semibold text-left transition-colors"
              :class="pillClass(opt.value, i)"
              :disabled="answered"
              @click="submitAnswer(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div v-if="current.imageUrl" class="rounded-2xl overflow-hidden bg-slate-900 min-h-[240px]">
          <img :src="current.imageUrl" class="w-full h-full object-contain" />
        </div>
      </div>
    </div>

    <UCard v-else-if="phase === 'result'" class="w-full max-w-sm">
      <div class="flex flex-col gap-4 text-center">
        <h1 class="text-2xl">🎉</h1>
        <div class="flex justify-around">
          <div>
            <p class="text-stone text-sm">{{ t('play.score') }}</p>
            <p class="text-2xl">{{ score }}</p>
          </div>
          <div>
            <p class="text-stone text-sm">{{ t('play.correct') }}</p>
            <p class="text-2xl">{{ correctCount }}/{{ questions.length }}</p>
          </div>
          <div>
            <p class="text-stone text-sm">{{ t('play.time') }}</p>
            <p class="text-2xl">{{ elapsedSec }}s</p>
          </div>
        </div>
        <ul class="text-left flex flex-col gap-1">
          <li v-for="(r, i) in review" :key="i" class="flex justify-between text-sm">
            <span class="truncate">{{ i + 1 }}. {{ r.question.text }}</span>
            <span>{{ r.correct ? '✅' : '❌' }}</span>
          </li>
        </ul>
        <UButton block @click="playAgain">{{ t('play.playAgain') }}</UButton>
      </div>
    </UCard>
  </main>
</template>
