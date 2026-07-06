<script setup lang="ts">
import { GAMES, type GameDef, type GameComplete } from '~/games/registry'
import type { PlayQuestion } from '~/utils/gradeAnswer'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

const { t } = useI18n()

// ponytail: hardcoded demo set — demos are fully client-side (no assignment, no JWT, no result POST)
const SAMPLE_QUESTIONS: PlayQuestion[] = [
  { id: 'demo-1', type: 'mcq', text: '5 + 7 = ?', imageUrl: null, timeLimitSec: 20, config: { options: ['10', '11', '12', '13'], correct: 2 } },
  { id: 'demo-2', type: 'mcq', text: 'Thủ đô của Việt Nam là thành phố nào?', imageUrl: null, timeLimitSec: 20, config: { options: ['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh', 'Huế'], correct: 0 } },
  { id: 'demo-3', type: 'true-false', text: 'Trái Đất quay quanh Mặt Trời.', imageUrl: null, timeLimitSec: 15, config: { correct: true } },
  { id: 'demo-4', type: 'mcq', text: 'Từ nào viết đúng chính tả?', imageUrl: null, timeLimitSec: 20, config: { options: ['xạch xẽ', 'sạch sẽ', 'sạch xẽ', 'xạch sẽ'], correct: 1 } },
  { id: 'demo-5', type: 'true-false', text: '100 cm bằng 1 m.', imageUrl: null, timeLimitSec: 15, config: { correct: true } },
  { id: 'demo-6', type: 'mcq', text: 'Con vật nào sống dưới nước?', imageUrl: null, timeLimitSec: 20, config: { options: ['Con mèo', 'Con gà', 'Con cá', 'Con chó'], correct: 2 } },
]

const demoGame = ref<GameDef | null>(null)
const demoResult = ref<GameComplete | null>(null)
const demoAttempt = ref(0)

function startDemo(game: GameDef) {
  demoResult.value = null
  demoAttempt.value++
  demoGame.value = game
}

function replayDemo() {
  demoResult.value = null
  demoAttempt.value++
}

function closeDemo() {
  demoGame.value = null
  demoResult.value = null
}
</script>

<template>
  <main class="max-w-6xl mx-auto p-8">
    <PageHeader :title="t('games.title')" />

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="g in GAMES"
        :key="g.id"
        class="card p-5 rounded-2xl shadow-[0_4px_12px_rgba(58,46,38,0.07)] flex flex-col"
        :class="g.status === 'coming-soon' ? 'opacity-60' : ''"
      >
        <div class="flex items-center gap-3 mb-2">
          <span class="text-3xl">{{ g.icon }}</span>
          <p class="font-bold text-lg flex-1 truncate">{{ g.name }}</p>
          <UBadge v-if="g.tier === 'pro'" color="warning" variant="subtle" class="rounded-full">Pro</UBadge>
        </div>
        <p class="text-stone text-sm flex-1 mb-4">{{ g.description }}</p>
        <UButton v-if="g.status === 'live'" block @click="startDemo(g)">{{ t('games.demo') }}</UButton>
        <UButton v-else block disabled variant="soft">{{ t('games.comingSoon') }}</UButton>
      </div>
    </div>

    <div v-if="demoGame" class="fixed inset-0 z-50 bg-cream flex items-center justify-center p-4">
      <UButton
        class="absolute top-4 right-4"
        variant="ghost"
        icon="i-lucide-x"
        :aria-label="t('games.close')"
        @click="closeDemo"
      />

      <component
        :is="demoGame.component"
        v-if="!demoResult"
        :key="demoAttempt"
        :questions="SAMPLE_QUESTIONS"
        @complete="demoResult = $event"
      />

      <UCard v-else class="w-full max-w-sm">
        <div class="flex flex-col gap-4 text-center">
          <h1 class="text-2xl">🎉</h1>
          <div class="flex justify-around">
            <StatTile :label="t('play.score')" :value="demoResult.score" />
            <StatTile
              :label="t('play.correct')"
              :value="`${demoResult.answers.filter((a) => a.correct).length}/${SAMPLE_QUESTIONS.length}`"
            />
          </div>
          <p class="text-stone text-sm">{{ t('games.demoNote') }}</p>
          <UButton block @click="replayDemo">{{ t('play.playAgain') }}</UButton>
          <UButton block variant="ghost" @click="closeDemo">{{ t('games.close') }}</UButton>
        </div>
      </UCard>
    </div>
  </main>
</template>
