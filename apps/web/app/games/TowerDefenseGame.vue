<script setup lang="ts">
import type { AskQuestion, GameConfig } from '~/games/registry'

// Tower Defense: full-screen canvas. Enemies walk an S-path toward the base;
// towers on fixed build spots auto-shoot while a burst is active. Correct
// answer = coins + the wave resumes/continues; wrong answer = no burst (the
// field stays frozen mid-wave — no free damage). Placing/upgrading towers is
// allowed while frozen too (planning phase). Ends when the question pool is
// exhausted or the base falls; score = waves survived × bonus.
const props = defineProps<{ askQuestion: AskQuestion; config: GameConfig }>()
const emit = defineEmits<{ complete: [result: { score: number }] }>()

const { t } = useI18n()

// path + build spots in fractions of the canvas; ponytail: path param moves at
// uniform fractional (not pixel) speed, so pace varies slightly with aspect —
// per-segment pixel lengths if it ever feels off
const PATH = [
  [0, 0.22],
  [0.72, 0.22],
  [0.72, 0.52],
  [0.28, 0.52],
  [0.28, 0.8],
  [1, 0.8],
] as const
const SPOTS = [
  [0.25, 0.37],
  [0.55, 0.37],
  [0.88, 0.37],
  [0.12, 0.66],
  [0.5, 0.66],
  [0.85, 0.62],
] as const
const LEVELS = [
  { dmg: 10, range: 0.19, cooldown: 0.8 },
  { dmg: 18, range: 0.23, cooldown: 0.65 },
  { dmg: 30, range: 0.27, cooldown: 0.5 },
] as const
const BUILD_COST = 50
const UPGRADE_COST = 60
const COINS_PER_CORRECT = 80
const COINS_PER_KILL = 5
const WAVE_BONUS = 200
const BASE_HP = 10
const SPAWN_GAP = 0.9 // s between enemies of a wave
const WAVE_GAP = 1.5 // s pause between cleared wave and the next
const ENEMY_EMOJI = ['👾', '🐛', '🦇', '👹', '🐲']
const HUD_H = 56

// path segments by fractional length, for walking enemies along it
const SEGS = PATH.slice(1).map((p, i) => {
  const [ax, ay] = PATH[i]!
  const len = Math.hypot(p[0] - ax, p[1] - ay)
  return { ax, ay, bx: p[0], by: p[1], len }
})
const PATH_LEN = SEGS.reduce((s, seg) => s + seg.len, 0)

function pathXY(s: number): [number, number] {
  let d = s * PATH_LEN
  for (const seg of SEGS) {
    if (d <= seg.len) {
      const f = d / seg.len
      return [seg.ax + (seg.bx - seg.ax) * f, seg.ay + (seg.by - seg.ay) * f]
    }
    d -= seg.len
  }
  return [PATH[PATH.length - 1]![0], PATH[PATH.length - 1]![1]]
}

interface Enemy {
  s: number // 0..1 along the path
  hp: number
  maxHp: number
}
interface Tower {
  spot: number
  level: number // index into LEVELS
  cooldown: number
  beam: { x: number; y: number; life: number } | null
}

const canvasEl = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D
let active = false
let coins = 0
let baseHp = BASE_HP
let wave = 1
let wavesSurvived = 0
let toSpawn = 0 // enemies of the current wave not yet spawned
let spawnIn = 0
let waveGapLeft = 0
let enemies: Enemy[] = []
let towers: Tower[] = []
let raf = 0
let burstEndAt = 0

function waveSize(n: number) {
  return 4 + n
}
function enemyHp(n: number) {
  return 20 + (n - 1) * 10
}
function enemySpeed(n: number) {
  return Math.min(0.05 + n * 0.004, 0.09) // path fractions per second
}

function startWave() {
  toSpawn = waveSize(wave)
  spawnIn = 0
}

async function run() {
  startWave()
  let res
  while ((res = await props.askQuestion())) {
    if (res.correct) {
      coins += COINS_PER_CORRECT
      const baseFell = await burst()
      if (baseFell) break
    }
  }
  emit('complete', { score: wavesSurvived * WAVE_BONUS })
}

function burst() {
  return new Promise<boolean>((resolve) => {
    active = true
    let lastT = performance.now()
    burstEndAt = lastT + props.config.gameTimeSec * 1000

    const tick = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05)
      lastT = t
      step(dt)
      draw()

      if (baseHp <= 0) {
        active = false
        draw()
        resolve(true)
        return
      }
      if (t >= burstEndAt) {
        active = false
        draw()
        resolve(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  })
}

function step(dt: number) {
  // wave flow: spawn pending enemies; cleared wave → short gap → next wave
  if (waveGapLeft > 0) {
    waveGapLeft -= dt
    if (waveGapLeft <= 0) startWave()
  } else if (toSpawn > 0) {
    spawnIn -= dt
    if (spawnIn <= 0) {
      spawnIn = SPAWN_GAP
      toSpawn--
      enemies.push({ s: 0, hp: enemyHp(wave), maxHp: enemyHp(wave) })
    }
  } else if (enemies.length === 0) {
    wavesSurvived++
    wave++
    waveGapLeft = WAVE_GAP
  }

  const speed = enemySpeed(wave)
  for (const e of enemies) e.s += speed * dt
  enemies = enemies.filter((e) => {
    if (e.s >= 1) {
      baseHp--
      return false
    }
    return true
  })

  // towers: instant-hit shot at the nearest enemy in range
  const c = canvasEl.value!
  const w = c.clientWidth
  const h = c.clientHeight
  const unit = Math.min(w, h)
  for (const tw of towers) {
    if (tw.beam) {
      tw.beam.life -= dt
      if (tw.beam.life <= 0) tw.beam = null
    }
    tw.cooldown -= dt
    if (tw.cooldown > 0) continue
    const lvl = LEVELS[tw.level]!
    const [sx, sy] = SPOTS[tw.spot]!
    let best: Enemy | null = null
    let bestD = lvl.range * unit
    for (const e of enemies) {
      const [ex, ey] = pathXY(e.s)
      const d = Math.hypot((ex - sx) * w, (ey - sy) * h)
      if (d < bestD) {
        bestD = d
        best = e
      }
    }
    if (!best) continue
    tw.cooldown = lvl.cooldown
    best.hp -= lvl.dmg
    const [ex, ey] = pathXY(best.s)
    tw.beam = { x: ex, y: ey, life: 0.1 }
    if (best.hp <= 0) {
      coins += COINS_PER_KILL
      enemies = enemies.filter((e) => e !== best)
    }
  }
}

function draw() {
  const c = canvasEl.value
  if (!c || !ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = c.width / dpr
  const h = c.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#14532d' // grass
  ctx.fillRect(0, 0, w, h)

  // path
  ctx.strokeStyle = '#a16207'
  ctx.lineWidth = Math.min(w, h) * 0.07
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(PATH[0]![0] * w, PATH[0]![1] * h)
  for (const [x, y] of PATH.slice(1)) ctx.lineTo(x * w, y * h)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = active ? 1 : 0.6

  // build spots + towers
  SPOTS.forEach(([x, y], i) => {
    const tw = towers.find((t2) => t2.spot === i)
    if (!tw) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x * w - 18, y * h - 18, 36, 36)
      ctx.setLineDash([])
      if (coins >= BUILD_COST) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = 'bold 15px sans-serif'
        ctx.fillText('+', x * w, y * h)
      }
    } else {
      if (tw.beam) {
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x * w, y * h)
        ctx.lineTo(tw.beam.x * w, tw.beam.y * h)
        ctx.stroke()
      }
      ctx.font = `${28 + tw.level * 6}px sans-serif`
      ctx.fillText('🏹', x * w, y * h)
      ctx.fillStyle = '#fde047'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText('★'.repeat(tw.level + 1), x * w, y * h + 26)
    }
  })

  // enemies with hp bars
  for (const e of enemies) {
    const [ex, ey] = pathXY(e.s)
    ctx.font = '26px sans-serif'
    ctx.fillText(ENEMY_EMOJI[(wave - 1) % ENEMY_EMOJI.length]!, ex * w, ey * h)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(ex * w - 15, ey * h - 22, 30, 4)
    ctx.fillStyle = '#f87171'
    ctx.fillRect(ex * w - 15, ey * h - 22, 30 * (e.hp / e.maxHp), 4)
  }

  // base at the end of the path
  const [bx, by] = PATH[PATH.length - 1]!
  ctx.font = '36px sans-serif'
  ctx.fillText('🏰', bx * w - 24, by * h - 40)
  ctx.globalAlpha = 1

  // HUD: coins, wave, base hearts, countdown
  ctx.fillStyle = 'rgba(20, 40, 24, 0.85)'
  ctx.fillRect(0, 0, w, HUD_H)
  ctx.font = 'bold 15px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fde047'
  ctx.fillText(`🪙 ${coins}`, 16, HUD_H / 2)
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText(`🌊 ${wave}`, 100, HUD_H / 2)
  ctx.textAlign = 'right'
  ctx.fillStyle = baseHp > 3 ? '#e2e8f0' : '#f87171'
  ctx.fillText(`❤️ ${Math.max(0, baseHp)}/${BASE_HP}`, w - 16, HUD_H / 2)
  if (active) {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fde047'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText(`⏱ ${Math.max(0, Math.ceil((burstEndAt - performance.now()) / 1000))}s`, w / 2, HUD_H / 2)
  }
  // build hint under the HUD
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(t('games.buildHint', { build: BUILD_COST, upgrade: UPGRADE_COST }), w / 2, HUD_H + 18)
}

// tap a spot: empty + affordable → build; existing → upgrade (max level 3)
function onTap(e: PointerEvent) {
  const c = canvasEl.value
  if (!c || baseHp <= 0) return
  const w = c.clientWidth
  const h = c.clientHeight
  const i = SPOTS.findIndex(([x, y]) => Math.hypot(e.offsetX - x * w, e.offsetY - y * h) < 32)
  if (i === -1) return
  const tw = towers.find((t2) => t2.spot === i)
  if (!tw && coins >= BUILD_COST) {
    coins -= BUILD_COST
    towers.push({ spot: i, level: 0, cooldown: 0, beam: null })
  } else if (tw && tw.level < LEVELS.length - 1 && coins >= UPGRADE_COST) {
    coins -= UPGRADE_COST
    tw.level++
  }
  draw()
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
