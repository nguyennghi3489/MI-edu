export const SUBJECTS = [
  { name: 'Toán', color: '#2563EB', soft: '#DBEAFE', icon: '➗' },
  { name: 'Văn', color: '#7C3AED', soft: '#EDE9FE', icon: '✍️' },
  { name: 'Khoa học', color: '#16A34A', soft: '#DCFCE7', icon: '🔬' },
  { name: 'Lịch sử', color: '#D97706', soft: '#FEF3C7', icon: '🏛️' },
  { name: 'Tiếng Anh', color: '#0D9488', soft: '#CCFBF1', icon: '🔤' },
] as const

export function subjectSoft(name: string) {
  return SUBJECTS.find((s) => s.name === name)?.soft ?? '#EFE8D9'
}

export function subjectIcon(name: string) {
  return SUBJECTS.find((s) => s.name === name)?.icon ?? '📘'
}

export function subjectColor(name: string) {
  return SUBJECTS.find((s) => s.name === name)?.color ?? '#7A736B'
}
