<script setup lang="ts">
import { gradeAnswer, type PlayQuestion } from '~/utils/gradeAnswer'
import type { AnswerRecord } from '~/games/registry'

// One question: countdown bar, answer pills, grading. Remount per question
// (parent sets :key="question.id") — state resets via component lifecycle.
const props = defineProps<{ question: PlayQuestion }>()
const emit = defineEmits<{ answered: [result: AnswerRecord] }>()

const { t } = useI18n()

// quiz.com-style pill colors, up to 4 options
const PILL_COLORS = ['bg-emerald-200 text-emerald-950', 'bg-lime-200 text-lime-950', 'bg-amber-200 text-amber-950', 'bg-rose-200 text-rose-950']

const answered = ref(false)
const chosen = ref<number | boolean | undefined>(undefined)
const timeLeft = ref(props.question.timeLimitSec)
let timerHandle: ReturnType<typeof setInterval> | undefined
let startedAt = 0

const options = computed<{ label: string; value: number | boolean }[]>(() => {
  const q = props.question
  if (q.type === 'true-false') {
    return [
      { label: t('lessons.true'), value: true },
      { label: t('lessons.false'), value: false },
    ]
  }
  return (q.config.options ?? []).map((label, i) => ({ label, value: i }))
})

function submitAnswer(value: number | boolean | undefined) {
  if (answered.value) return
  answered.value = true
  chosen.value = value
  clearInterval(timerHandle)

  const correct = value !== undefined && gradeAnswer(props.question, value)
  emit('answered', {
    questionId: props.question.id,
    answer: value ?? false,
    correct,
    timeMs: Date.now() - startedAt,
  })
}

function pillClass(value: number | boolean, i: number) {
  if (!answered.value) return PILL_COLORS[i]
  if (value === props.question.config.correct) return 'bg-emerald-500 text-white'
  if (value === chosen.value) return 'bg-rose-500 text-white'
  return `${PILL_COLORS[i]} opacity-50`
}

onMounted(() => {
  startedAt = Date.now()
  timerHandle = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) submitAnswer(undefined)
  }, 1000)
})

onUnmounted(() => clearInterval(timerHandle))
</script>

<template>
  <div>
    <div class="h-2 rounded-full bg-slate-800 mb-6 overflow-hidden">
      <div
        class="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
        :style="{ width: `${(timeLeft / question.timeLimitSec) * 100}%` }"
      />
    </div>
    <slot />
    <div class="grid gap-6" :class="question.imageUrl ? 'md:grid-cols-2' : ''">
      <div>
        <h2 class="text-2xl text-white mb-6">{{ question.text }}</h2>
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
      <div v-if="question.imageUrl" class="rounded-2xl overflow-hidden bg-slate-900 min-h-[240px]">
        <img :src="question.imageUrl" class="w-full h-full object-contain" />
      </div>
    </div>
  </div>
</template>
