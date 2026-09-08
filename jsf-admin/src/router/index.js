import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { getToken, isValidToken } from '@/api/request/token'
import { bindRouter, setupDynamicRoutes, resolveHomePath } from './dynamic'
import { createLogger } from '@/utils/logger'

const log = createLogger('router')

const constantRoutes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: []
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes
})

bindRouter(router)

let dynamicRoutesReady = false

router.beforeEach((to) => {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  userStore.syncFromStorage()
  permissionStore.syncFromStorage()

  const loggedIn = isValidToken(getToken())
  const has = (code) => permissionStore.has(code)

  if (!to.meta.public && !loggedIn) {
    dynamicRoutesReady = false
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'Login' && loggedIn) {
    if (!dynamicRoutesReady) {
      setupDynamicRoutes(has)
      dynamicRoutesReady = true
    }
    return resolveHomePath(has)
  }

  if (loggedIn && !dynamicRoutesReady) {
    setupDynamicRoutes(has)
    dynamicRoutesReady = true
    if (to.path === '/' || to.name === 'Layout' || to.matched.length <= 1) {
      // 仅命中 Layout、或根路径时，落到有权限的首页
      if (!to.name || to.name === 'Layout' || to.path === '/') {
        return resolveHomePath(has)
      }
    }
    // 动态路由刚注册，重进一次以匹配详情等子路由
    return { path: to.fullPath, replace: true }
  }

  if (loggedIn && to.meta.permission && !has(to.meta.permission)) {
    return { name: 'Forbidden' }
  }
})

router.afterEach((to, from) => {
  if (import.meta.env.DEV) {
    log.debug(`导航 ${from.fullPath || '/'} → ${to.fullPath}`)
  }
})

export { setupDynamicRoutes, resolveHomePath }
export default router
