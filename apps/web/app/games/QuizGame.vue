<script setup lang="ts">
import type { PlayQuestion } from '~/utils/gradeAnswer'
import type { AnswerRecord, GameComplete } from '~/games/registry'

const props = defineProps<{ questions: PlayQuestion[] }>()
const emit = defineEmits<{ complete: [result: GameComplete] }>()

const { t } = useI18n()
const POINTS_PER_CORRECT = 100

const currentIndex = ref(0)
const current = computed(() => props.questions[currentIndex.value]!)
const score = ref(0)
const answers: AnswerRecord[] = []

function onAnswered(result: AnswerRecord) {
  if (result.correct) score.value += POINTS_PER_CORRECT
  answers.push(result)
  setTimeout(() => {
    if (currentIndex.value + 1 < props.questions.length) {
      currentIndex.value++
    } else {
      emit('complete', { answers, score: score.value })
    }
  }, 900)
}
</script>

<template>
  <div class="w-full max-w-4xl">
    <QuestionGate :key="current.id" :question="current" @answered="onAnswered">
      <p class="text-slate-400 text-sm mb-2">
        {{ t('play.question') }} {{ currentIndex + 1 }} {{ t('play.of') }} {{ questions.length }}
      </p>
    </QuestionGate>
  </div>
</template>
