<script setup lang="ts">
import type { PlayQuestion } from '~/utils/gradeAnswer'
import type { AnswerRecord, GameComplete } from '~/games/registry'
import BurstGameLoop from '~/games/BurstGameLoop.vue'

// Space Race: during each burst you steer a rocket between 3 lanes — stars
// boost, rocks slow — racing a ghost that only moves during bursts too.
// Scene is canvas + rAF; HUD and steer buttons are DOM.
const props = withDefaults(
  defineProps<{ questions: PlayQuestion[]; gameTimeSec?: number; ghostScore?: number | null }>(),
  { gameTimeSec: 20, ghostScore: null },
)
const emit = defineEmits<{ complete: [result: GameComplete] }>()

const { t } = useI18n()

const BASE_SPEED = 60 // distance units per second
const BOOST_MULT = 2
const SLOW_MULT = 0.4
const EFFECT_SEC = 1.5
const SPAWN_EVERY = 0.9 // seconds between item spawns
const ITEM_FALL = 0.55 // arena heights per second
const WIN_BONUS = 300
const LANES = 3
const CAR_Y = 0.82 // rocket position, fraction of arena height

// Ghost pace: class-average past score spread over the max possible burst
// time; ponytail: default ghost runs at 80% of base speed so early players
// (and demos) can win by driving well.
const totalBurstSec = props.questions.length * props.gameTimeSec
const ghostSpeed = props.ghostScore ? props.ghostScore / totalBurstSec : BASE_SPEED * 0.8
// track length for the HUD progress bar — the "perfect run" distance
const trackTotal = totalBurstSec * BASE_SPEED

interface Item {
  lane: number
  y: number // fraction of arena height from top
  kind: 'star' | 'rock'
}

const active = ref(false)
const distance = ref(0)
const ghost = ref(0)

const canvasEl = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D
let lane = 1
let items: Item[] = []
let effect: 'boost' | 'slow' | null = null
let raf = 0
let lastT = 0
let spawnIn = 0
let effectLeft = 0

function tick(t: number) {
  const dt = Math.min((t - lastT) / 1000, 0.05)
  lastT = t

  if (effectLeft > 0) {
    effectLeft -= dt
    if (effectLeft <= 0) effect = null
  }
  const mult = effect === 'boost' ? BOOST_MULT : effect === 'slow' ? SLOW_MULT : 1
  distance.value += BASE_SPEED * mult * dt
  ghost.value += ghostSpeed * dt

  spawnIn -= dt
  if (spawnIn <= 0) {
    spawnIn = SPAWN_EVERY
    items.push({
      lane: Math.floor(Math.random() * LANES),
      y: -0.1,
      kind: Math.random() < 0.55 ? 'star' : 'rock',
    })
  }

  for (const it of items) it.y += ITEM_FALL * dt
  items = items.filter((it) => {
    if (it.y > 1.1) return false
    if (it.lane === lane && Math.abs(it.y - CAR_Y) < 0.08) {
      effect = it.kind === 'star' ? 'boost' : 'slow'
      effectLeft = EFFECT_SEC
      return false
    }
    return true
  })

  draw()
  raf = requestAnimationFrame(tick)
}

function laneX(l: number, w: number) {
  return (w / LANES) * (l + 0.5)
}

function draw() {
  const c = canvasEl.value
  if (!c || !ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = c.width / dpr
  const h = c.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#020617' // slate-950
  ctx.fillRect(0, 0, w, h)

  // lane dividers
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.setLineDash([12, 12])
  for (let l = 1; l < LANES; l++) {
    ctx.beginPath()
    ctx.moveTo((w / LANES) * l, 0)
    ctx.lineTo((w / LANES) * l, h)
    ctx.stroke()
  }
  ctx.setLineDash([])

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.font = '30px sans-serif'
  for (const it of items) {
    ctx.fillText(it.kind === 'star' ? '⭐' : '🪨', laneX(it.lane, w), it.y * h)
  }

  // rocket (emoji points up-right, rotate to point up)
  ctx.save()
  ctx.translate(laneX(lane, w), CAR_Y * h)
  ctx.rotate(-Math.PI / 4)
  ctx.font = '44px sans-serif'
  ctx.fillText('🚀', 0, 0)
  ctx.restore()

  if (effect) {
    ctx.font = '22px sans-serif'
    ctx.fillText(effect === 'boost' ? '🔥' : '💫', laneX(lane, w), (CAR_Y + 0.11) * h)
  }
}

function resizeCanvas() {
  const c = canvasEl.value
  if (!c) return
  const dpr = window.devicePixelRatio || 1
  c.width = c.clientWidth * dpr
  c.height = c.clientHeight * dpr
  ctx = c.getContext('2d')!
  draw()
}

function onBurstStart() {
  active.value = true
  lastT = performance.now()
  spawnIn = 0
  raf = requestAnimationFrame(tick)
}

function onBurstEnd() {
  active.value = false
  cancelAnimationFrame(raf)
}

function steer(dir: -1 | 1) {
  if (!active.value) return
  lane = Math.min(LANES - 1, Math.max(0, lane + dir))
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') steer(-1)
  else if (e.key === 'ArrowRight') steer(1)
}

function onLoopComplete(answers: AnswerRecord[]) {
  onBurstEnd()
  const won = distance.value > ghost.value
  // ponytail: score = distance + flat win bonus; margin-weighted scoring if it matters
  emit('complete', { answers, score: Math.round(distance.value) + (won ? WIN_BONUS : 0) })
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', resizeCanvas)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', resizeCanvas)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="w-full max-w-xl">
    <div class="flex items-center gap-3 mb-2 text-sm font-semibold text-bark">
      <span>🚀 {{ t('games.you') }}: {{ Math.round(distance) }}m</span>
      <span class="flex-1" />
      <span>👻 {{ t('games.ghost') }}: {{ Math.round(ghost) }}m</span>
    </div>
    <div class="relative h-4 rounded-full bg-slate-300 mb-3 overflow-hidden">
      <div
        class="absolute inset-y-0 left-0 bg-slate-400/60"
        :style="{ width: `${Math.min(ghost / trackTotal, 1) * 100}%` }"
      />
      <div
        class="absolute inset-y-0 left-0 bg-emerald-500/80"
        :style="{ width: `${Math.min(distance / trackTotal, 1) * 100}%` }"
      />
    </div>

    <BurstGameLoop
      :questions="questions"
      :game-time-sec="gameTimeSec"
      @burst-start="onBurstStart"
      @burst-end="onBurstEnd"
      @complete="onLoopComplete"
    >
      <div class="relative h-[55dvh] min-h-80 rounded-2xl overflow-hidden select-none">
        <canvas ref="canvasEl" class="block size-full" />

        <button
          type="button"
          class="absolute bottom-3 left-3 size-14 rounded-full bg-white/15 text-2xl text-white active:bg-white/30"
          :aria-label="t('games.steerLeft')"
          @click="steer(-1)"
        >
          ◀
        </button>
        <button
          type="button"
          class="absolute bottom-3 right-3 size-14 rounded-full bg-white/15 text-2xl text-white active:bg-white/30"
          :aria-label="t('games.steerRight')"
          @click="steer(1)"
        >
          ▶
        </button>
      </div>
    </BurstGameLoop>
  </div>
</template>
