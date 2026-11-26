const ROUTE_MENU_REQUIREMENTS: Record<string, string> = {
  '/cuentas/diarias': 'CUENTAS_DIARIAS',
  '/administracion/usuarios': 'ADMIN_USUARIOS',
  '/administracion/roles': 'ADMIN_ROLES'
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, hasMenu } = useAuth()

  if (!user.value) {
    await fetchUser()
  }

  if (to.path === '/login') {
    if (user.value) {
      return navigateTo('/')
    }
    return
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  const requiredMenu = ROUTE_MENU_REQUIREMENTS[to.path]
  if (requiredMenu && !hasMenu(requiredMenu)) {
    return navigateTo('/')
  }
})
