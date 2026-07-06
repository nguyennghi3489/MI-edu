<script setup lang="ts">
import type { AskQuestion, GameConfig } from '~/games/registry'

// Fishing Frenzy: full-screen canvas, calm pace. During a burst: tap to cast,
// the bobber sits until a bite (❗ + dip), tap within the bite window to land
// a random fish (weight tiers, rare catches) — miss and it escapes. As many
// casts as time allows; total kg carries over between bursts (pond frozen).
// Trigger back to the quiz: burst timer expiry (via askQuestion).
const props = defineProps<{ askQuestion: AskQuestion; config: GameConfig }>()
const emit = defineEmits<{ complete: [result: { score: number }] }>()

const { t } = useI18n()

// ponytail: flat rarity table, weights sum to 1; tune here
const FISH = [
  { emoji: '🐟', min: 1, max: 3, weight: 0.55 },
  { emoji: '🐠', min: 3, max: 6, weight: 0.25 },
  { emoji: '🐡', min: 6, max: 10, weight: 0.12 },
  { emoji: '🦈', min: 15, max: 25, weight: 0.06 },
  { emoji: '🐋', min: 40, max: 60, weight: 0.02 },
] as const
const BITE_AFTER: [number, number] = [0.8, 2.2] // random wait before a bite
const BITE_WINDOW = 1.2 // seconds to react
const HUD_H = 56
const WATER_Y = 0.35 // waterline, fraction of height
const BOB_X = 0.5

type Phase = 'idle' | 'waiting' | 'bite'

const canvasEl = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D
let active = false
let totalKg = 0
let phase: Phase = 'idle'
let phaseLeft = 0
let elapsed = 0 // running clock for bobber/deco animation
let floats: { label: string; life: number }[] = []
let deco = Array.from({ length: 3 }, (_, i) => ({ x: Math.random(), y: 0.55 + i * 0.13, dir: Math.random() < 0.5 ? -1 : 1 }))
let raf = 0
let burstEndAt = 0

async function run() {
  let res
  while ((res = await props.askQuestion())) {
    if (res.correct) await burst()
  }
  emit('complete', { score: Math.round(totalKg) })
}

function rollFish() {
  const r = Math.random()
  let acc = 0
  for (const f of FISH) {
    acc += f.weight
    if (r < acc) return f
  }
  return FISH[0]
}

function burst() {
  return new Promise<void>((resolve) => {
    active = true
    let lastT = performance.now()
    burstEndAt = lastT + props.config.gameTimeSec * 1000

    const tick = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05)
      lastT = t
      elapsed += dt

      if (phase !== 'idle') {
        phaseLeft -= dt
        if (phaseLeft <= 0) {
          if (phase === 'waiting') {
            phase = 'bite'
            phaseLeft = BITE_WINDOW
          } else {
            phase = 'idle' // bite window missed — fish escapes
            floats.push({ label: '💨', life: 0.8 })
          }
        }
      }

      for (const d of deco) {
        d.x += d.dir * 0.03 * dt
        if (d.x < -0.1 || d.x > 1.1) d.dir *= -1
      }
      for (const f of floats) f.life -= dt
      floats = floats.filter((f) => f.life > 0)

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

function onTap() {
  if (!active) return
  if (phase === 'idle') {
    phase = 'waiting'
    phaseLeft = BITE_AFTER[0] + Math.random() * (BITE_AFTER[1] - BITE_AFTER[0])
  } else if (phase === 'bite') {
    const f = rollFish()
    const kg = Math.round((f.min + Math.random() * (f.max - f.min)) * 10) / 10
    totalKg += kg
    floats.push({ label: `${f.emoji} +${kg}kg`, life: 1.2 })
    phase = 'idle'
  }
  // tap during 'waiting' does nothing — patience is the game
}

function draw() {
  const c = canvasEl.value
  if (!c || !ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = c.width / dpr
  const h = c.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // sky + water
  ctx.fillStyle = '#7dd3fc'
  ctx.fillRect(0, 0, w, h * WATER_Y)
  ctx.fillStyle = '#0369a1'
  ctx.fillRect(0, h * WATER_Y, w, h)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = active ? 1 : 0.5

  // decorative fish drifting under water
  ctx.font = '22px sans-serif'
  ctx.globalAlpha = (active ? 1 : 0.5) * 0.4
  for (const d of deco) ctx.fillText('🐟', d.x * w, d.y * h)
  ctx.globalAlpha = active ? 1 : 0.5

  // angler on a boat at the waterline
  ctx.font = '44px sans-serif'
  ctx.fillText('🛶', w * 0.22, h * WATER_Y)
  ctx.font = '34px sans-serif'
  ctx.fillText('🧑‍🎣', w * 0.22, h * WATER_Y - 34)

  if (phase !== 'idle') {
    // line + bobber; bobber dips and ❗ shows during the bite window
    const dip = phase === 'bite' ? 10 + Math.sin(elapsed * 20) * 4 : Math.sin(elapsed * 3) * 3
    const bx = w * BOB_X
    const by = h * WATER_Y + dip
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w * 0.22 + 20, h * WATER_Y - 44)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.font = '20px sans-serif'
    ctx.fillText('🔴', bx, by)
    if (phase === 'bite') {
      ctx.font = 'bold 34px sans-serif'
      ctx.fillText('❗', bx, by - 40)
    }
  } else if (active) {
    ctx.fillStyle = '#e0f2fe'
    ctx.font = 'bold 17px sans-serif'
    ctx.fillText(t('games.tapToCast'), w / 2, h * 0.62)
  }

  // floating catch labels above the bobber
  ctx.fillStyle = '#fef9c3'
  ctx.font = 'bold 22px sans-serif'
  for (const f of floats) {
    ctx.globalAlpha = Math.min(1, f.life * 2)
    ctx.fillText(f.label, w * BOB_X, h * WATER_Y - 60 - (1.2 - f.life) * 30)
  }
  ctx.globalAlpha = 1

  // HUD: total kg + burst countdown
  ctx.fillStyle = 'rgba(2, 44, 77, 0.8)'
  ctx.fillRect(0, 0, w, HUD_H)
  ctx.fillStyle = '#e0f2fe'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`🐟 ${Math.round(totalKg * 10) / 10} kg`, 16, HUD_H / 2)
  if (active) {
    ctx.textAlign = 'center'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText(`⏱ ${Math.max(0, Math.ceil((burstEndAt - performance.now()) / 1000))}s`, w / 2, HUD_H / 2)
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
