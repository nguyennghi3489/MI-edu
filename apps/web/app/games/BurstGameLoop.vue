<script setup lang="ts">
import type { PlayQuestion } from '~/utils/gradeAnswer'
import type { AnswerRecord } from '~/games/registry'

// Shared session rhythm for burst games (05–09): question → correct answer →
// game burst of gameTimeSec seconds → next question; wrong answer → next
// question immediately. The slot (the game scene) stays mounted the whole
// session — the parent game freezes/resumes it via burstStart/burstEnd.
const props = withDefaults(
  defineProps<{ questions: PlayQuestion[]; gameTimeSec?: number }>(),
  { gameTimeSec: 20 },
)
const emit = defineEmits<{
  burstStart: []
  burstEnd: []
  complete: [answers: AnswerRecord[]]
}>()

const { t } = useI18n()

const phase = ref<'question' | 'burst'>('question')
const index = ref(0)
const current = computed(() => props.questions[index.value]!)
const answers: AnswerRecord[] = []
const burstLeft = ref(0)
let burstTimer: ReturnType<typeof setInterval> | undefined

function onAnswered(result: AnswerRecord) {
  answers.push(result)
  // let QuestionGate flash the correct answer before moving on
  setTimeout(() => {
    if (result.correct) startBurst()
    else advance()
  }, 900)
}

function startBurst() {
  phase.value = 'burst'
  burstLeft.value = props.gameTimeSec
  emit('burstStart')
  burstTimer = setInterval(() => {
    burstLeft.value--
    if (burstLeft.value <= 0) {
      clearInterval(burstTimer)
      emit('burstEnd')
      advance()
    }
  }, 1000)
}

function advance() {
  if (index.value + 1 < props.questions.length) {
    index.value++
    phase.value = 'question'
  } else {
    emit('complete', answers)
  }
}

onUnmounted(() => clearInterval(burstTimer))
</script>

<template>
  <div class="relative w-full">
    <slot />

    <div
      v-if="phase === 'question'"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-950/85 p-4 overflow-y-auto"
    >
      <div class="w-full max-w-xl">
        <QuestionGate :key="current.id" :question="current" @answered="onAnswered">
          <p class="text-slate-400 text-sm mb-2">
            {{ t('play.question') }} {{ index + 1 }} {{ t('play.of') }} {{ questions.length }}
          </p>
        </QuestionGate>
      </div>
    </div>

    <div
      v-else
      class="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full bg-slate-950/70 px-4 py-1 font-bold text-white tabular-nums"
    >
      ⏱ {{ burstLeft }}s
    </div>
  </div>
</template>
