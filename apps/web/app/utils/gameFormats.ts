// Lesson-card pill meta per game id (ids match apps/web/app/games/registry.ts).
const GAME_FORMATS: Record<string, { label: string; icon: string; color: string; soft: string }> = {
  quiz: { label: 'Quiz', icon: '✓', color: '#2563EB', soft: '#DBEAFE' },
  'space-race': { label: 'Đua xe vũ trụ', icon: '🚀', color: '#5C7A52', soft: '#E4E9DE' },
  'gold-quest': { label: 'Săn vàng', icon: '💰', color: '#D97706', soft: '#FEF3C7' },
  cafe: { label: 'Quán cà phê', icon: '☕', color: '#9A3412', soft: '#FEE8D9' },
  'fishing-frenzy': { label: 'Câu cá', icon: '🎣', color: '#0369A1', soft: '#E0F2FE' },
  'tower-defense': { label: 'Phòng thủ tháp', icon: '🏰', color: '#6D28D9', soft: '#EDE9FE' },
}

export function gameFormatMeta(format: string) {
  return GAME_FORMATS[format] ?? { label: format, icon: '🎮', color: '#7A736B', soft: '#EFE8D9' }
}
