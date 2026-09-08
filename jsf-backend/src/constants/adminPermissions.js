/** 管理后台权限树（菜单 + 按钮）— 锦食坊餐厅平台 */

/** 平台运营权限树 */
const PERMISSION_TREE = [
  {
    code: 'menu:dashboard',
    name: '首页',
    type: 'menu'
  },
  {
    code: 'menu:onboarding',
    name: '入驻审核',
    type: 'menu',
    children: [{ code: 'onboarding:review', name: '通过/驳回', type: 'button' }]
  },
  {
    code: 'menu:restaurants',
    name: '餐厅管理',
    type: 'menu',
    children: [
      { code: 'restaurant:edit', name: '编辑餐厅', type: 'button' },
      { code: 'restaurant:app-account', name: '商家 App 账号', type: 'button' }
    ]
  },
  {
    code: 'menu:dishes',
    name: '菜单管理',
    type: 'menu',
    children: [{ code: 'restaurant:menu', name: '编辑分类/菜品', type: 'button' }]
  },
  {
    code: 'menu:cuisine-types',
    name: '品类管理',
    type: 'menu',
    children: [
      { code: 'cuisine:create', name: '新增品类', type: 'button' },
      { code: 'cuisine:edit', name: '编辑品类', type: 'button' },
      { code: 'cuisine:delete', name: '删除品类', type: 'button' }
    ]
  },
  {
    code: 'menu:reservations',
    name: '预约单',
    type: 'menu',
    children: [{ code: 'reservation:status', name: '修改状态', type: 'button' }]
  },
  {
    code: 'menu:banners',
    name: '轮播管理',
    type: 'menu',
    children: [
      { code: 'banner:create', name: '新增轮播', type: 'button' },
      { code: 'banner:edit', name: '编辑轮播', type: 'button' },
      { code: 'banner:delete', name: '删除轮播', type: 'button' }
    ]
  },
  {
    code: 'menu:users',
    name: '用户管理',
    type: 'menu'
  },
  {
    code: 'menu:settings',
    name: '系统设置',
    type: 'menu',
    children: [
      { code: 'menu:settings.platform', name: '平台配置', type: 'menu' },
      { code: 'settings.platform:edit', name: '保存平台配置', type: 'button' }
    ]
  },
  {
    code: 'menu:system',
    name: '权限配置',
    type: 'menu',
    children: [
      { code: 'admin:create', name: '新增管理员', type: 'button' },
      { code: 'admin:edit', name: '编辑管理员', type: 'button' },
      { code: 'admin:delete', name: '删除管理员', type: 'button' },
      { code: 'admin:permission', name: '分配权限', type: 'button' }
    ]
  }
]

/**
 * 门店组织权限树（店主）
 * — 首页、预约单、我的门店、菜单管理
 */
const ORG_PERMISSION_TREE = [
  {
    code: 'menu:dashboard',
    name: '首页',
    type: 'menu'
  },
  {
    code: 'menu:reservations',
    name: '预约单',
    type: 'menu',
    children: [{ code: 'reservation:status', name: '接单/改状态', type: 'button' }]
  },
  {
    code: 'menu:restaurants',
    name: '我的门店',
    type: 'menu',
    children: [
      { code: 'restaurant:edit', name: '编辑门店', type: 'button' },
      { code: 'restaurant:app-account', name: '登录账号', type: 'button' }
    ]
  },
  {
    code: 'menu:dishes',
    name: '菜单管理',
    type: 'menu',
    children: [{ code: 'restaurant:menu', name: '编辑分类/菜品', type: 'button' }]
  }
]

function flattenPermissionTree(nodes = PERMISSION_TREE, list = []) {
  for (const node of nodes) {
    list.push(node.code)
    if (node.children?.length) flattenPermissionTree(node.children, list)
  }
  return list
}

const ALL_PERMISSION_CODES = flattenPermissionTree(PERMISSION_TREE)
const ORG_PERMISSION_CODES = flattenPermissionTree(ORG_PERMISSION_TREE)

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) return []
  return [...new Set(permissions.filter((c) => ALL_PERMISSION_CODES.includes(c)))]
}

function getEffectivePermissions(user) {
  if (!user) return []
  if (user.orgType === 'restaurant' || user.role === 'merchant_admin') {
    return [...ORG_PERMISSION_CODES]
  }
  if (user.isSuper) return [...ALL_PERMISSION_CODES]
  return normalizePermissions(user.permissions)
}

function hasPermission(user, code) {
  if (!user) return false
  if (user.isSuper && user.orgType !== 'restaurant') return true
  const perms = getEffectivePermissions(user)
  return perms.includes(code)
}

/** 是否门店组织账号（数据需按 restaurantId 隔离） */
function isOrgAdmin(user) {
  return !!(user && (user.orgType === 'restaurant' || user.role === 'merchant_admin') && user.restaurantId)
}

function getPermissionTreeForUser(user) {
  if (isOrgAdmin(user)) return ORG_PERMISSION_TREE
  return PERMISSION_TREE
}

module.exports = {
  PERMISSION_TREE,
  ORG_PERMISSION_TREE,
  ALL_PERMISSION_CODES,
  ORG_PERMISSION_CODES,
  normalizePermissions,
  getEffectivePermissions,
  hasPermission,
  isOrgAdmin,
  getPermissionTreeForUser
}
