<script setup lang="ts">
import type { Component } from 'vue'
import type { PlayQuestion } from '~/utils/gradeAnswer'
import type { AnswerRecord, GameComplete } from '~/games/registry'

// Session shell for every game: renders the game full-size underneath, owns
// the question pool + answer log, and overlays QuestionGate whenever the game
// calls its askQuestion prop (see AskQuestion in registry.ts). Games never
// see questions or answers — only { correct } outcomes and their own score.
const props = withDefaults(
  defineProps<{
    questions: PlayQuestion[]
    game: Component
    gameTimeSec?: number
    ghostScore?: number | null
  }>(),
  { gameTimeSec: 20, ghostScore: null },
)
const emit = defineEmits<{ complete: [result: GameComplete] }>()

const { t } = useI18n()

const index = ref(0)
const answers: AnswerRecord[] = []
const pending = ref<((r: { correct: boolean } | null) => void) | null>(null)
const current = computed(() => props.questions[index.value])

const config = computed(() => ({
  gameTimeSec: props.gameTimeSec,
  ghostScore: props.ghostScore,
  questionCount: props.questions.length,
}))

function askQuestion(): Promise<{ correct: boolean } | null> {
  if (index.value >= props.questions.length) return Promise.resolve(null)
  return new Promise((resolve) => {
    pending.value = resolve
  })
}

function onAnswered(result: AnswerRecord) {
  answers.push(result)
  // let QuestionGate flash the correct answer before handing back to the game
  setTimeout(() => {
    const resolve = pending.value
    pending.value = null
    index.value++
    resolve?.({ correct: result.correct })
  }, 900)
}

function onGameComplete({ score }: { score: number }) {
  emit('complete', { answers, score })
}
</script>

<template>
  <div class="relative size-full">
    <component
      :is="game"
      class="absolute inset-0"
      :ask-question="askQuestion"
      :config="config"
      @complete="onGameComplete"
    />

    <div
      v-if="pending"
      class="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/85 p-4 overflow-y-auto"
    >
      <div class="w-full max-w-xl">
        <QuestionGate :key="current!.id" :question="current!" @answered="onAnswered">
          <p class="text-slate-400 text-sm mb-2">
            {{ t('play.question') }} {{ index + 1 }} {{ t('play.of') }} {{ questions.length }}
          </p>
        </QuestionGate>
      </div>
    </div>
  </div>
</template>
