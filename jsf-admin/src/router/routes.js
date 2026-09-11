import { PERMISSION } from '@/constants/permissions'

/** 需登录的业务路由（带 permission） */
export const asyncRoutes = [
  {
    path: 'dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '首页', permission: PERMISSION.MENU_DASHBOARD }
  },
  {
    path: 'onboarding/:id',
    name: 'OnboardingDetail',
    component: () => import('@/views/onboarding/Detail.vue'),
    meta: {
      title: '入驻详情',
      permission: PERMISSION.MENU_ONBOARDING,
      breadcrumb: [{ title: '入驻审核', path: '/onboarding' }]
    }
  },
  {
    path: 'onboarding',
    name: 'Onboarding',
    component: () => import('@/views/onboarding/List.vue'),
    meta: { title: '入驻审核', permission: PERMISSION.MENU_ONBOARDING }
  },
  {
    path: 'restaurants/:id',
    name: 'RestaurantDetail',
    component: () => import('@/views/restaurants/Detail.vue'),
    meta: {
      title: '餐厅详情',
      permission: PERMISSION.MENU_RESTAURANTS,
      breadcrumb: [{ title: '餐厅管理', path: '/restaurants' }]
    }
  },
  {
    path: 'restaurants',
    name: 'Restaurants',
    component: () => import('@/views/restaurants/List.vue'),
    meta: { title: '餐厅管理', permission: PERMISSION.MENU_RESTAURANTS }
  },
  {
    path: 'menus/categories',
    name: 'MenuCategories',
    component: () => import('@/views/menus/Index.vue'),
    meta: {
      title: '分类',
      permission: PERMISSION.MENU_DISHES,
      breadcrumb: [{ title: '菜单管理' }]
    }
  },
  {
    path: 'menus/dishes',
    name: 'MenuDishes',
    component: () => import('@/views/menus/Index.vue'),
    meta: {
      title: '菜品',
      permission: PERMISSION.MENU_DISHES,
      breadcrumb: [{ title: '菜单管理' }]
    }
  },
  {
    path: 'menus',
    name: 'Menus',
    redirect: (to) => ({ path: '/menus/categories', query: to.query }),
    meta: { permission: PERMISSION.MENU_DISHES }
  },
  {
    path: 'cuisine-types',
    name: 'CuisineTypes',
    component: () => import('@/views/cuisine-types/List.vue'),
    meta: { title: '品类管理', permission: PERMISSION.MENU_CUISINE_TYPES }
  },
  {
    path: 'reservations/:id',
    name: 'ReservationDetail',
    component: () => import('@/views/reservations/Detail.vue'),
    meta: {
      title: '预约详情',
      permission: PERMISSION.MENU_RESERVATIONS,
      breadcrumb: [{ title: '预约单', path: '/reservations' }]
    }
  },
  {
    path: 'reservations',
    name: 'Reservations',
    component: () => import('@/views/reservations/List.vue'),
    meta: { title: '预约单', permission: PERMISSION.MENU_RESERVATIONS }
  },
  {
    path: 'banners/new',
    name: 'BannerCreate',
    component: () => import('@/views/banners/Edit.vue'),
    meta: {
      title: '新增轮播',
      permission: PERMISSION.BANNER_CREATE,
      breadcrumb: [{ title: '轮播管理', path: '/banners' }]
    }
  },
  {
    path: 'banners/:id/edit',
    name: 'BannerEdit',
    component: () => import('@/views/banners/Edit.vue'),
    meta: {
      title: '编辑轮播',
      permission: PERMISSION.BANNER_EDIT,
      breadcrumb: [{ title: '轮播管理', path: '/banners' }]
    }
  },
  {
    path: 'banners',
    name: 'Banners',
    component: () => import('@/views/banners/List.vue'),
    meta: { title: '轮播管理', permission: PERMISSION.MENU_BANNERS }
  },
  {
    path: 'users',
    name: 'Users',
    component: () => import('@/views/users/List.vue'),
    meta: { title: '用户管理', permission: PERMISSION.MENU_USERS }
  },
  {
    path: 'settings/platform',
    name: 'PlatformSettings',
    component: () => import('@/views/settings/Platform.vue'),
    meta: {
      title: '平台配置',
      permission: PERMISSION.MENU_SETTINGS_PLATFORM,
      breadcrumb: [{ title: '系统设置' }]
    }
  },
  {
    path: 'system/admins',
    name: 'SystemAdmins',
    component: () => import('@/views/system/Admins.vue'),
    meta: {
      title: '管理员账号',
      permission: PERMISSION.MENU_SYSTEM,
      breadcrumb: [{ title: '权限配置' }]
    }
  },
  {
    path: 'forbidden',
    name: 'Forbidden',
    component: () => import('@/views/Forbidden.vue'),
    meta: { title: '无权限' }
  }
]

/**
 * @param {typeof asyncRoutes} routes
 * @param {(code: string) => boolean} hasPermission
 */
export function filterRoutesByPermission(routes, hasPermission) {
  return routes.filter((route) => {
    const code = route.meta?.permission
    if (code && !hasPermission(code)) return false
    return true
  })
}

/**
 * @param {import('vue-router').Router} router
 * @param {(code: string) => boolean} hasPermission
 */
export function resetDynamicRoutes(router, hasPermission) {
  asyncRoutes.forEach((route) => {
    if (route.name && router.hasRoute(route.name)) {
      router.removeRoute(route.name)
    }
  })
  filterRoutesByPermission(asyncRoutes, hasPermission).forEach((route) => {
    router.addRoute('Layout', route)
  })
}

/**
 * @param {import('vue-router').Router} router
 * @param {(code: string) => boolean} hasPermission
 * @returns {string}
 */
export function getDefaultRoutePath(router, hasPermission) {
  const first = filterRoutesByPermission(asyncRoutes, hasPermission).find((r) => r.path === 'dashboard')
    || filterRoutesByPermission(asyncRoutes, hasPermission)[0]
  if (!first) return '/forbidden'
  return `/${first.path}`
}
