<script setup lang="ts">
import type { AskQuestion, GameConfig } from '~/games/registry'

// Space Race: full-screen canvas. Each burst you steer a rocket between 3
// lanes — stars boost, rocks slow — racing a ghost that only moves during
// bursts too. Trigger back to the quiz: burst timer expiry (via askQuestion).
const props = defineProps<{ askQuestion: AskQuestion; config: GameConfig }>()
const emit = defineEmits<{ complete: [result: { score: number }] }>()

const { t } = useI18n()

const BASE_SPEED = 60 // distance units per second
const BOOST_MULT = 2
const SLOW_MULT = 0.4
const EFFECT_SEC = 1.5
const SPAWN_EVERY = 0.9 // seconds between item spawns
const ITEM_FALL = 0.55 // arena heights per second
const WIN_BONUS = 300
const LANES = 3
const CAR_Y = 0.82 // rocket position, fraction of canvas height

// Ghost pace: class-average past score spread over the max possible burst
// time; ponytail: default ghost runs at 80% of base speed so early players
// (and demos) can win by driving well.
const totalBurstSec = props.config.questionCount * props.config.gameTimeSec
const ghostSpeed = props.config.ghostScore
  ? props.config.ghostScore / totalBurstSec
  : BASE_SPEED * 0.8
// "perfect run" distance — scales the HUD progress bar
const trackTotal = totalBurstSec * BASE_SPEED

interface Item {
  lane: number
  y: number // fraction of canvas height from top
  kind: 'star' | 'rock'
}

const canvasEl = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D
let active = false
let distance = 0
let ghost = 0
let lane = 1
let items: Item[] = []
let effect: 'boost' | 'slow' | null = null
let raf = 0
let spawnIn = 0
let effectLeft = 0
let burstEndAt = 0

async function run() {
  let res
  while ((res = await props.askQuestion())) {
    if (res.correct) await burst()
  }
  const won = distance > ghost
  // ponytail: score = distance + flat win bonus; margin-weighted scoring if it matters
  emit('complete', { score: Math.round(distance) + (won ? WIN_BONUS : 0) })
}

function burst() {
  return new Promise<void>((resolve) => {
    active = true
    let lastT = performance.now()
    burstEndAt = lastT + props.config.gameTimeSec * 1000
    spawnIn = 0

    const tick = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05)
      lastT = t

      if (effectLeft > 0) {
        effectLeft -= dt
        if (effectLeft <= 0) effect = null
      }
      const mult = effect === 'boost' ? BOOST_MULT : effect === 'slow' ? SLOW_MULT : 1
      distance += BASE_SPEED * mult * dt
      ghost += ghostSpeed * dt

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
      if (t >= burstEndAt) {
        active = false
        draw()
        resolve()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  })
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

  // HUD: distances, you-vs-ghost progress bar, burst countdown
  ctx.fillStyle = 'rgba(2, 6, 23, 0.7)'
  ctx.fillRect(0, 0, w, 56)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`🚀 ${t('games.you')} ${Math.round(distance)}m`, 16, 22)
  ctx.textAlign = 'right'
  ctx.fillText(`👻 ${t('games.ghost')} ${Math.round(ghost)}m`, w - 16, 22)

  ctx.fillStyle = '#334155'
  ctx.fillRect(16, 38, w - 32, 8)
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(16, 38, (w - 32) * Math.min(ghost / trackTotal, 1), 8)
  ctx.fillStyle = '#10b981'
  ctx.fillRect(16, 38, (w - 32) * Math.min(distance / trackTotal, 1), 4)

  if (active) {
    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`⏱ ${Math.max(0, Math.ceil((burstEndAt - performance.now()) / 1000))}s`, w / 2, 80)
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

function steer(dir: -1 | 1) {
  if (!active) return
  lane = Math.min(LANES - 1, Math.max(0, lane + dir))
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') steer(-1)
  else if (e.key === 'ArrowRight') steer(1)
}

// tap a lane on the canvas to move the rocket there
function onTap(e: PointerEvent) {
  const c = canvasEl.value
  if (!active || !c) return
  lane = Math.min(LANES - 1, Math.max(0, Math.floor((e.offsetX / c.clientWidth) * LANES)))
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', resizeCanvas)
  run()
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', resizeCanvas)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <canvas ref="canvasEl" class="block size-full touch-none select-none" @pointerdown="onTap" />
</template>
