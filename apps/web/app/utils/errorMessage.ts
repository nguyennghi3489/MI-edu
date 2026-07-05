export function errorMessage(e: any, t: (key: string) => string): string {
  if (e.data?.code === 'PLAN_LIMIT') return t('plan.limitReached')
  return e.data?.message ?? t('auth.failed')
}
