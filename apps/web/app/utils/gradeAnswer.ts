export interface PlayQuestion {
  id: string
  type: string // 'mcq' | 'true-false'
  text: string
  imageUrl: string | null
  timeLimitSec: number
  config: { options?: string[]; correct: number | boolean }
}

export function gradeAnswer(question: PlayQuestion, studentAnswer: number | boolean): boolean {
  return studentAnswer === question.config.correct
}
