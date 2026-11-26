import type { AuthUser } from '~/types'

export function useAuth() {
  const user = useState<AuthUser | null>('cody-auth-user', () => null)
  const initialized = useState<boolean>('cody-auth-initialized', () => false)

  async function fetchUser(force = false) {
    if (initialized.value && !force) {
      return user.value
    }
    try {
      const requestFetch = useRequestFetch()
      const data = await requestFetch<{ user: AuthUser | null }>('/api/auth/me')
      user.value = data.user
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
    return user.value
  }

  async function login(username: string, password: string) {
    const data = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    })
    user.value = data.user
    initialized.value = true
    return data.user
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      initialized.value = true
      await navigateTo('/login')
    }
  }

  function hasMenu(codigo: string): boolean {
    return Boolean(user.value?.menuCodigos.includes(codigo))
  }

  return {
    user,
    initialized,
    fetchUser,
    login,
    logout,
    hasMenu
  }
}
