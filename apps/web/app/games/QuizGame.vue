<script setup lang="ts">
import type { AskQuestion, GameConfig } from '~/games/registry'

// Plain quiz — the no-game mode. Under the GameSession contract it's the
// degenerate game: no scene, just ask the next question until the pool runs
// out. The session's overlay renders every question.
const props = defineProps<{ askQuestion: AskQuestion; config: GameConfig }>()
const emit = defineEmits<{ complete: [result: { score: number }] }>()

const POINTS_PER_CORRECT = 100

onMounted(async () => {
  let score = 0
  let res
  while ((res = await props.askQuestion())) {
    if (res.correct) score += POINTS_PER_CORRECT
  }
  emit('complete', { score })
})
</script>

<template>
  <div class="size-full bg-slate-950" />
</template>
