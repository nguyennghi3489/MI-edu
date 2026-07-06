import { defineAsyncComponent, type Component } from 'vue'

export interface AnswerRecord {
  questionId: string
  answer: number | boolean
  correct: boolean
  timeMs: number
}

// Every game emits complete({ answers, score }) — answers feed the learning
// analytics identically across games; score is the game's own currency.
export interface GameComplete {
  answers: AnswerRecord[]
  score: number
}

export interface GameDef {
  id: string
  name: string
  description: string
  icon: string
  tier: 'free' | 'pro'
  status: 'live' | 'coming-soon'
  component?: Component
}

// Quiz is NOT a game — it's the plain, free play mode a lesson uses when no game
// is attached. Question types (mcq / true-false) are a separate axis entirely:
// they're picked per question and gate bursts inside whichever game is chosen.
export const QUIZ: GameDef = {
  id: 'quiz',
  name: 'Quiz',
  description: '',
  icon: '✓',
  tier: 'free',
  status: 'live',
  component: defineAsyncComponent(() => import('./QuizGame.vue')),
}

// The 5 real games — this is what the /games catalog shows.
export const GAMES: GameDef[] = [
  {
    id: 'space-race',
    name: 'Đua xe vũ trụ',
    description: 'Trả lời đúng để tăng tốc, vượt qua xe "bóng ma" và về đích trước.',
    icon: '🚀',
    tier: 'pro',
    status: 'live',
    component: defineAsyncComponent(() => import('./SpaceRaceGame.vue')),
  },
  {
    id: 'gold-quest',
    name: 'Săn vàng',
    description: 'Trả lời đúng để mở rương kho báu — vàng, mất vàng hay nhân đôi?',
    icon: '💰',
    tier: 'pro',
    status: 'coming-soon',
  },
  {
    id: 'cafe',
    name: 'Quán cà phê',
    description: 'Trả lời đúng để có món ăn, phục vụ khách trước khi họ hết kiên nhẫn.',
    icon: '☕',
    tier: 'pro',
    status: 'coming-soon',
  },
  {
    id: 'fishing-frenzy',
    name: 'Câu cá',
    description: 'Trả lời đúng để quăng cần — cá to, cá nhỏ hay cá hiếm?',
    icon: '🎣',
    tier: 'pro',
    status: 'coming-soon',
  },
  {
    id: 'tower-defense',
    name: 'Phòng thủ tháp',
    description: 'Trả lời đúng để nhận vàng, xây tháp chặn từng đợt quái vật.',
    icon: '🏰',
    tier: 'pro',
    status: 'coming-soon',
  },
]

// Unknown or not-yet-built formats fall back to the quiz.
export function resolveGame(format: string | undefined): GameDef {
  const game = GAMES.find((g) => g.id === format)
  return game?.status === 'live' && game.component ? game : QUIZ
}
