/** 与后端 adminPermissions.js 保持一致的权限码 */
export const PERMISSION = {
  MENU_ONBOARDING: 'menu:onboarding',
  ONBOARDING_REVIEW: 'onboarding:review',
  MENU_DASHBOARD: 'menu:dashboard',
  MENU_RESTAURANTS: 'menu:restaurants',
  MENU_DISHES: 'menu:dishes',
  MENU_CUISINE_TYPES: 'menu:cuisine-types',
  MENU_RESERVATIONS: 'menu:reservations',
  MENU_BANNERS: 'menu:banners',
  MENU_USERS: 'menu:users',
  MENU_SETTINGS: 'menu:settings',
  MENU_SETTINGS_PLATFORM: 'menu:settings.platform',
  MENU_SYSTEM: 'menu:system',

  RESTAURANT_EDIT: 'restaurant:edit',
  RESTAURANT_MENU: 'restaurant:menu',

  CUISINE_CREATE: 'cuisine:create',
  CUISINE_EDIT: 'cuisine:edit',
  CUISINE_DELETE: 'cuisine:delete',

  BANNER_CREATE: 'banner:create',
  BANNER_EDIT: 'banner:edit',
  BANNER_DELETE: 'banner:delete',

  RESERVATION_STATUS: 'reservation:status',

  SETTINGS_PLATFORM_EDIT: 'settings.platform:edit',

  ADMIN_CREATE: 'admin:create',
  ADMIN_EDIT: 'admin:edit',
  ADMIN_DELETE: 'admin:delete',
  ADMIN_PERMISSION: 'admin:permission'
}

/** @type {string[]} */
export const ALL_PERMISSION_CODES = [
  'menu:dashboard',
  'menu:onboarding',
  'onboarding:review',
  'menu:restaurants',
  'restaurant:edit',
  'menu:dishes',
  'restaurant:menu',
  'menu:cuisine-types',
  'cuisine:create',
  'cuisine:edit',
  'cuisine:delete',
  'menu:reservations',
  'reservation:status',
  'menu:banners',
  'banner:create',
  'banner:edit',
  'banner:delete',
  'menu:users',
  'menu:settings',
  'menu:settings.platform',
  'settings.platform:edit',
  'menu:system',
  'admin:create',
  'admin:edit',
  'admin:delete',
  'admin:permission'
]
