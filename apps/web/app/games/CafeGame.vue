<script setup lang="ts">
import type { AskQuestion, GameConfig } from '~/games/registry'

// Café: full-screen canvas. Customers queue up wanting a dish, their patience
// ticks down only during bursts; you serve by tapping the matching dish button
// (if stocked). Each correct answer restocks the counter and starts a burst.
// Queue/stock/coins freeze between bursts. Trigger back to the quiz: burst
// timer expiry (via askQuestion).
const props = defineProps<{ askQuestion: AskQuestion; config: GameConfig }>()
const emit = defineEmits<{ complete: [result: { score: number }] }>()

const { t } = useI18n()

const DISHES = ['🍜', '🍰', '☕'] as const
const FACES = ['🧑', '👧', '👵', '👨', '🧒']
const PATIENCE_SEC = 9
const SPAWN_EVERY = 2.4
const QUEUE_MAX = 5
const RESTOCK_PER_DISH = 2
const SERVE_COINS = 10 // + up to 5 patience bonus
const HUD_H = 56
const COUNTER_H = 96 // dish-button strip at the bottom

interface Customer {
  face: string
  wants: number // index into DISHES
  patience: number // seconds left
}

const canvasEl = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D
let active = false
let coins = 0
let stock = [0, 0, 0]
let queue: Customer[] = []
let floats: { x: number; y: number; label: string; life: number }[] = []
let raf = 0
let spawnIn = 0
let burstEndAt = 0

async function run() {
  let res
  while ((res = await props.askQuestion())) {
    if (res.correct) {
      for (let i = 0; i < stock.length; i++) stock[i] += RESTOCK_PER_DISH
      await burst()
    }
  }
  emit('complete', { score: Math.round(coins) })
}

function spawnCustomer() {
  queue.push({
    face: FACES[Math.floor(Math.random() * FACES.length)]!,
    wants: Math.floor(Math.random() * DISHES.length),
    patience: PATIENCE_SEC,
  })
}

function burst() {
  return new Promise<void>((resolve) => {
    active = true
    let lastT = performance.now()
    burstEndAt = lastT + props.config.gameTimeSec * 1000
    spawnIn = 0
    if (queue.length === 0) spawnCustomer()

    const tick = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05)
      lastT = t

      spawnIn -= dt
      if (spawnIn <= 0 && queue.length < QUEUE_MAX) {
        spawnIn = SPAWN_EVERY
        spawnCustomer()
      }

      for (const cu of queue) cu.patience -= dt
      queue = queue.filter((cu) => cu.patience > 0) // timed out → leaves, no penalty

      for (const f of floats) f.life -= dt
      floats = floats.filter((f) => f.life > 0)

      draw()
      if (t >= burstEndAt) {
        active = false
        floats = []
        draw()
        resolve()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  })
}

function serve(dish: number) {
  if (!stock[dish]) return
  const i = queue.findIndex((cu) => cu.wants === dish)
  if (i === -1) return
  const cu = queue[i]!
  stock[dish]!--
  const bonus = Math.round((cu.patience / PATIENCE_SEC) * 5)
  coins += SERVE_COINS + bonus
  queue.splice(i, 1)
  const c = canvasEl.value!
  floats.push({
    x: queueX(i, c.clientWidth),
    y: c.clientHeight * 0.45,
    label: `+${SERVE_COINS + bonus}`,
    life: 0.8,
  })
}

function queueX(i: number, w: number) {
  return w * 0.14 + i * Math.min(w * 0.18, 90)
}

function dishRect(i: number, w: number, h: number) {
  const bw = w / DISHES.length
  return { x: i * bw, y: h - COUNTER_H, w: bw, h: COUNTER_H }
}

function draw() {
  const c = canvasEl.value
  if (!c || !ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = c.width / dpr
  const h = c.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#2a1a10' // warm café brown
  ctx.fillRect(0, 0, w, h)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = active ? 1 : 0.5

  // customers along the counter
  const cy = h * 0.5
  queue.forEach((cu, i) => {
    const x = queueX(i, w)
    ctx.font = '40px sans-serif'
    ctx.fillText(cu.face, x, cy)
    // speech bubble with the wanted dish
    ctx.font = '22px sans-serif'
    ctx.fillText(DISHES[cu.wants]!, x + 18, cy - 44)
    // patience bar
    const frac = Math.max(0, cu.patience / PATIENCE_SEC)
    ctx.fillStyle = '#334155'
    ctx.fillRect(x - 22, cy + 30, 44, 6)
    ctx.fillStyle = frac > 0.5 ? '#10b981' : frac > 0.25 ? '#facc15' : '#f87171'
    ctx.fillRect(x - 22, cy + 30, 44 * frac, 6)
  })
  ctx.globalAlpha = 1

  // floating +coins
  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 18px sans-serif'
  for (const f of floats) {
    ctx.globalAlpha = Math.min(1, f.life * 2)
    ctx.fillText(f.label, f.x, f.y - (0.8 - f.life) * 40)
  }
  ctx.globalAlpha = 1

  // dish counter (bottom): button per dish with stock badge
  DISHES.forEach((d, i) => {
    const r = dishRect(i, w, h)
    const hasStock = (stock[i] ?? 0) > 0
    ctx.fillStyle = hasStock && active ? '#44281a' : '#1f130b'
    ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8)
    ctx.globalAlpha = hasStock ? 1 : 0.35
    ctx.font = '36px sans-serif'
    ctx.fillText(d, r.x + r.w / 2, r.y + r.h / 2 - 8)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(`×${stock[i]}`, r.x + r.w / 2, r.y + r.h - 18)
  })

  // HUD: coins + burst countdown
  ctx.fillStyle = 'rgba(42, 26, 16, 0.85)'
  ctx.fillRect(0, 0, w, HUD_H)
  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`🪙 ${Math.round(coins)}`, 16, HUD_H / 2)
  if (active) {
    ctx.textAlign = 'center'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText(`⏱ ${Math.max(0, Math.ceil((burstEndAt - performance.now()) / 1000))}s`, w / 2, HUD_H / 2)
  }
}

function onTap(e: PointerEvent) {
  const c = canvasEl.value
  if (!active || !c) return
  const h = c.clientHeight
  if (e.offsetY < h - COUNTER_H) return
  serve(Math.floor((e.offsetX / c.clientWidth) * DISHES.length))
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

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  run()
})
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <canvas ref="canvasEl" class="block size-full touch-none select-none" @pointerdown="onTap" />
</template>
