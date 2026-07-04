export interface Teacher {
  id: string
  email: string
  name: string
  school: string | null
  plan: string
}

interface AuthResponse {
  accessToken: string
  teacher: Teacher
}

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie<string | null>('token', { maxAge: 60 * 60 * 24 * 7 })
  const teacher = ref<Teacher | null>(null)

  async function signup(body: { email: string; password: string; name: string; school?: string }) {
    const res = await $fetch<AuthResponse>('/api/auth/signup', { method: 'POST', body })
    token.value = res.accessToken
    teacher.value = res.teacher
  }

  async function login(body: { email: string; password: string }) {
    const res = await $fetch<AuthResponse>('/api/auth/login', { method: 'POST', body })
    token.value = res.accessToken
    teacher.value = res.teacher
  }

  function logout() {
    token.value = null
    teacher.value = null
  }

  return { token, teacher, signup, login, logout }
})
