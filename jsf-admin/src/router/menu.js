import { PERMISSION } from '@/constants/permissions'

/** @typedef {{ path?: string, title: string, icon?: string, permission?: string, children?: MenuItem[] }} MenuItem */

/** @type {MenuItem[]} */
export const MENU_ITEMS = [
  { path: '/dashboard', title: '首页', icon: 'HomeFilled', permission: PERMISSION.MENU_DASHBOARD },
  { path: '/onboarding', title: '入驻审核', icon: 'Checked', permission: PERMISSION.MENU_ONBOARDING },
  { path: '/cuisine-types', title: '品类管理', icon: 'Menu', permission: PERMISSION.MENU_CUISINE_TYPES },
  { path: '/reservations', title: '预约单', icon: 'List', permission: PERMISSION.MENU_RESERVATIONS },
  { path: '/restaurants', title: '我的门店', icon: 'Shop', permission: PERMISSION.MENU_RESTAURANTS },
  {
    title: '菜单管理',
    icon: 'Dish',
    permission: PERMISSION.MENU_DISHES,
    children: [
      { path: '/menus/categories', title: '分类', permission: PERMISSION.MENU_DISHES },
      { path: '/menus/dishes', title: '菜品', permission: PERMISSION.MENU_DISHES }
    ]
  },
  { path: '/banners', title: '轮播管理', icon: 'Picture', permission: PERMISSION.MENU_BANNERS },
  { path: '/users', title: '用户管理', icon: 'User', permission: PERMISSION.MENU_USERS },
  {
    title: '系统设置',
    icon: 'Setting',
    permission: PERMISSION.MENU_SETTINGS,
    children: [
      { path: '/settings/platform', title: '平台配置', permission: PERMISSION.MENU_SETTINGS_PLATFORM }
    ]
  },
  {
    title: '权限配置',
    icon: 'Lock',
    permission: PERMISSION.MENU_SYSTEM,
    children: [{ path: '/system/admins', title: '管理员账号', permission: PERMISSION.MENU_SYSTEM }]
  }
]
