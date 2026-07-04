import type { FetchOptions } from 'ofetch'

export function useApi<T = unknown>(url: string, opts: FetchOptions = {}) {
  const token = useCookie('token')
  return $fetch<T>(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token.value}` },
  })
}
