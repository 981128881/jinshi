import router from '@/router'

/** 在当前页跳转到管理后台路由 */
export function openAdminPage(to) {
  return router.push(to)
}
