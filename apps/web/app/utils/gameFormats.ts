// ponytail: only 'quiz' is actually produced today (MEMORY.md — Space Race build was dropped
// in favor of a single quiz.com-style format); space-race/trivia entries kept as dormant labels
// in case a format picker returns, per PRD's "pick a game format" story.
const GAME_FORMATS: Record<string, { label: string; icon: string; color: string; soft: string }> = {
  quiz: { label: 'Trắc nghiệm', icon: '✓', color: '#2563EB', soft: '#DBEAFE' },
  'space-race': { label: 'Space Race', icon: '🚀', color: '#5C7A52', soft: '#E4E9DE' },
  trivia: { label: 'Đố vui', icon: '🎲', color: '#D97706', soft: '#FEF3C7' },
}

export function gameFormatMeta(format: string) {
  return GAME_FORMATS[format] ?? { label: format, icon: '🎮', color: '#7A736B', soft: '#EFE8D9' }
}
