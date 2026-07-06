<script setup lang="ts">
import type { AskQuestion, GameConfig } from '~/games/registry'

// Gold Quest: full-screen canvas. Each burst you tap as many chests as time
// allows — each chest gains gold, loses some, or doubles your pile (weighted
// random; luck-heavy by design). Gold carries over between bursts. Trigger
// back to the quiz: burst timer expiry (via askQuestion).
const props = defineProps<{ askQuestion: AskQuestion; config: GameConfig }>()
const emit = defineEmits<{ complete: [result: { score: number }] }>()

const { t } = useI18n()

const COLS = 3
const ROWS = 4
const REVEAL_SEC = 0.7 // outcome shown on the chest before it respawns
const HUD_H = 56
// ponytail: flat outcome table, weights sum to 1; tune here if it feels off
const OUTCOMES = [
  { kind: 'gain', weight: 0.62 },
  { kind: 'lose', weight: 0.28 },
  { kind: 'double', weight: 0.1 },
] as const

// Beat-the-target framing: class average when known, else a pace a decent
// run beats (~5 chests/burst at avg +18 gold each).
const target = props.config.ghostScore ?? props.config.questionCount * 90

interface Chest {
  state: 'closed' | 'open'
  label: string // e.g. "+25", "x2"
  emoji: string
  revealLeft: number
}

const canvasEl = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D
let active = false
let gold = 0
let chests: Chest[] = Array.from({ length: COLS * ROWS }, () => ({
  state: 'closed' as const,
  label: '',
  emoji: '',
  revealLeft: 0,
}))
let raf = 0
let burstEndAt = 0

async function run() {
  let res
  while ((res = await props.askQuestion())) {
    if (res.correct) await burst()
  }
  emit('complete', { score: Math.round(gold) })
}

function rollOutcome(): { delta: number; label: string; emoji: string } {
  const r = Math.random()
  let acc = 0
  let kind: (typeof OUTCOMES)[number]['kind'] = 'gain'
  for (const o of OUTCOMES) {
    acc += o.weight
    if (r < acc) {
      kind = o.kind
      break
    }
  }
  if (kind === 'double') return { delta: gold, label: 'x2', emoji: '✨' }
  if (kind === 'lose') {
    const loss = Math.min(gold, 10 + Math.floor(Math.random() * 16)) // -10..-25
    return { delta: -loss, label: `-${loss}`, emoji: '💀' }
  }
  const amount = 10 + Math.floor(Math.random() * 26) // +10..+35
  return { delta: amount, label: `+${amount}`, emoji: '💰' }
}

function burst() {
  return new Promise<void>((resolve) => {
    active = true
    let lastT = performance.now()
    burstEndAt = lastT + props.config.gameTimeSec * 1000

    const tick = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05)
      lastT = t

      for (const c of chests) {
        if (c.state === 'open') {
          c.revealLeft -= dt
          if (c.revealLeft <= 0) c.state = 'closed'
        }
      }

      draw()
      if (t >= burstEndAt) {
        active = false
        for (const c of chests) c.state = 'closed'
        draw()
        resolve()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  })
}

// chest grid geometry, shared by draw + hit-testing
function cellRect(i: number, w: number, h: number) {
  const gw = w / COLS
  const gh = (h - HUD_H) / ROWS
  return { x: (i % COLS) * gw, y: HUD_H + Math.floor(i / COLS) * gh, w: gw, h: gh }
}

function draw() {
  const c = canvasEl.value
  if (!c || !ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = c.width / dpr
  const h = c.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#1c1006' // cave brown-black
  ctx.fillRect(0, 0, w, h)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const emojiSize = Math.min(w / COLS, (h - HUD_H) / ROWS) * 0.45

  chests.forEach((chest, i) => {
    const r = cellRect(i, w, h)
    const cx = r.x + r.w / 2
    const cy = r.y + r.h / 2
    if (chest.state === 'closed') {
      ctx.globalAlpha = active ? 1 : 0.45
      ctx.font = `${emojiSize}px sans-serif`
      ctx.fillText('📦', cx, cy)
      ctx.globalAlpha = 1
    } else {
      // pop in: slight scale-up as the reveal starts
      const pop = 1 + Math.max(0, chest.revealLeft - (REVEAL_SEC - 0.15)) * 2
      ctx.font = `${emojiSize * pop}px sans-serif`
      ctx.fillText(chest.emoji, cx, cy - 10)
      ctx.fillStyle = chest.label.startsWith('-') ? '#f87171' : '#facc15'
      ctx.font = `bold ${Math.max(16, emojiSize * 0.4)}px sans-serif`
      ctx.fillText(chest.label, cx, cy + emojiSize * 0.55)
    }
  })

  // HUD: gold, target, burst countdown
  ctx.fillStyle = 'rgba(28, 16, 6, 0.85)'
  ctx.fillRect(0, 0, w, HUD_H)
  ctx.fillStyle = '#facc15'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`💰 ${Math.round(gold)}`, 16, HUD_H / 2)
  ctx.fillStyle = '#e2e8f0'
  ctx.textAlign = 'right'
  ctx.fillText(`🎯 ${t('games.target')} ${Math.round(target)}`, w - 16, HUD_H / 2)

  if (active) {
    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`⏱ ${Math.max(0, Math.ceil((burstEndAt - performance.now()) / 1000))}s`, w / 2, HUD_H + 24)
  }
}

function onTap(e: PointerEvent) {
  const c = canvasEl.value
  if (!active || !c) return
  const w = c.clientWidth
  const h = c.clientHeight
  const i = chests.findIndex((chest, idx) => {
    const r = cellRect(idx, w, h)
    return (
      chest.state === 'closed' &&
      e.offsetX >= r.x &&
      e.offsetX < r.x + r.w &&
      e.offsetY >= r.y &&
      e.offsetY < r.y + r.h
    )
  })
  if (i === -1) return
  const { delta, label, emoji } = rollOutcome()
  gold += delta
  chests[i] = { state: 'open', label, emoji, revealLeft: REVEAL_SEC }
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
