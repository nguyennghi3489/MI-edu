export const SUBJECTS = [
  { name: 'Toán', color: '#2563EB', soft: '#DBEAFE' },
  { name: 'Văn', color: '#7C3AED', soft: '#EDE9FE' },
  { name: 'Khoa học', color: '#16A34A', soft: '#DCFCE7' },
  { name: 'Lịch sử', color: '#D97706', soft: '#FEF3C7' },
  { name: 'Tiếng Anh', color: '#0D9488', soft: '#CCFBF1' },
] as const

export function subjectColor(name: string) {
  return SUBJECTS.find((s) => s.name === name)?.color ?? '#7A736B'
}
