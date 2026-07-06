<script setup lang="ts">
import type { PlayQuestion } from '~/utils/gradeAnswer'
import { resolveGame, type GameComplete } from '~/games/registry'

interface PublicAssignment {
  title: string
  subject: string
  questionCount: number
  gameFormat: string
  gameTimeSec: number
  avgScore: number | null
}

const route = useRoute()
const { t } = useI18n()
const assignmentId = route.query.a as string | undefined
const previewLessonId = route.query.lesson as string | undefined
const isPreview = !!previewLessonId

const { data: assignment, error } = await useAsyncData(`play-${assignmentId ?? previewLessonId}`, () => {
  if (isPreview) {
    return useApi<{ title: string; subject: string; gameFormat: string; gameTimeSec: number; questions: unknown[] }>(`/api/lessons/${previewLessonId}`).then(
      (l) => ({ title: l.title, subject: l.subject, questionCount: l.questions.length, gameFormat: l.gameFormat, gameTimeSec: l.gameTimeSec, avgScore: null }),
    )
  }
  return useApi<PublicAssignment>(`/api/assignments/${assignmentId}/public`)
})

const game = computed(() => resolveGame(assignment.value?.gameFormat))

const name = ref('')
const studentNumber = ref('')
const busy = ref(false)
const enterError = ref('')

type Phase = 'entry' | 'playing' | 'result'
const phase = ref<Phase>('entry')
const attempt = ref(0) // bumped on replay to remount the game component

const canStart = computed(() => name.value.trim() !== '' && studentNumber.value.trim() !== '')

const questions = ref<PlayQuestion[]>([])
const score = ref(0)
const correctCount = ref(0)
const review = ref<{ question: PlayQuestion; correct: boolean }[]>([])
const answerLog = ref<GameComplete['answers']>([])
let startedAt = 0
const elapsedSec = ref(0)
const submitState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

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
    startedAt = Date.now()
    phase.value = 'playing'
  } catch (e: any) {
    enterError.value = e.data?.message ?? t('auth.failed')
  } finally {
    busy.value = false
  }
}

function onComplete({ answers, score: gameScore }: GameComplete) {
  answerLog.value = answers
  score.value = gameScore
  correctCount.value = answers.filter((a) => a.correct).length
  review.value = answers.map((a) => ({
    question: questions.value.find((q) => q.id === a.questionId)!,
    correct: a.correct,
  }))
  elapsedSec.value = Math.round((Date.now() - startedAt) / 1000)
  phase.value = 'result'
  if (!isPreview) submitResult()
}

async function submitResult() {
  submitState.value = 'saving'
  try {
    const gameToken = sessionStorage.getItem('gameToken')
    await $fetch(`/api/results`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gameToken}` },
      body: {
        assignmentId,
        studentName: name.value,
        studentNumber: studentNumber.value,
        totalScore: score.value,
        totalCorrect: correctCount.value,
        totalQuestions: questions.value.length,
        answers: answerLog.value,
      },
    })
    submitState.value = 'saved'
  } catch {
    submitState.value = 'error'
  }
}

function playAgain() {
  answerLog.value = []
  submitState.value = 'idle'
  attempt.value++
  startedAt = Date.now()
  phase.value = 'playing'
}
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

    <component
      :is="game.component"
      v-else-if="phase === 'playing'"
      :key="attempt"
      :questions="questions"
      :game-time-sec="assignment!.gameTimeSec"
      :ghost-score="assignment!.avgScore"
      @complete="onComplete"
    />

    <UCard v-else-if="phase === 'result'" class="w-full max-w-sm">
      <div class="flex flex-col gap-4 text-center">
        <h1 class="text-2xl">🎉</h1>
        <div class="flex justify-around">
          <StatTile :label="t('play.score')" :value="score" />
          <StatTile :label="t('play.correct')" :value="`${correctCount}/${questions.length}`" />
          <StatTile :label="t('play.time')" :value="`${elapsedSec}s`" />
        </div>
        <ul class="text-left flex flex-col gap-1">
          <li v-for="(r, i) in review" :key="i" class="flex justify-between text-sm">
            <span class="truncate">{{ i + 1 }}. {{ r.question.text }}</span>
            <span>{{ r.correct ? '✅' : '❌' }}</span>
          </li>
        </ul>
        <p v-if="submitState === 'saved'" class="text-emerald-600 text-sm">{{ t('play.submitted') }}</p>
        <p v-else-if="submitState === 'error'" class="text-red-600 text-sm">{{ t('play.submitFailed') }}</p>
        <UButton block @click="playAgain">{{ t('play.playAgain') }}</UButton>
      </div>
    </UCard>
  </main>
</template>
