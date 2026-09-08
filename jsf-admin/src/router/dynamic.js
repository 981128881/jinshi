import { asyncRoutes, filterRoutesByPermission, getDefaultRoutePath } from './routes'

/** @type {import('vue-router').Router | null} */
let routerInstance = null

/** @param {import('vue-router').Router} router */
export function bindRouter(router) {
  routerInstance = router
}

/**
 * @param {(code: string) => boolean} hasPermission
 */
export function resetDynamicRoutes(hasPermission) {
  if (!routerInstance) return
  asyncRoutes.forEach((route) => {
    if (route.name && routerInstance.hasRoute(route.name)) {
      routerInstance.removeRoute(route.name)
    }
  })
  filterRoutesByPermission(asyncRoutes, hasPermission).forEach((route) => {
    routerInstance.addRoute('Layout', route)
  })
}

export function setupDynamicRoutes(hasPermission) {
  resetDynamicRoutes(hasPermission)
}

export function resolveHomePath(hasPermission) {
  if (!routerInstance) return '/dashboard'
  return getDefaultRoutePath(routerInstance, hasPermission)
}
