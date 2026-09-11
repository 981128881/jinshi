/** 管理后台权限树（菜单 + 按钮）— 金石菜牌齐市店 */

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
    children: [{ code: 'restaurant:edit', name: '编辑餐厅', type: 'button' }]
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

function flattenPermissionTree(nodes = PERMISSION_TREE, list = []) {
  for (const node of nodes) {
    list.push(node.code)
    if (node.children?.length) flattenPermissionTree(node.children, list)
  }
  return list
}

const ALL_PERMISSION_CODES = flattenPermissionTree(PERMISSION_TREE)

/** 商家后台：只看自己的店、菜单、预约单 */
const MERCHANT_PERMISSION_CODES = [
  'menu:dashboard',
  'menu:restaurants',
  'restaurant:edit',
  'menu:dishes',
  'restaurant:menu',
  'menu:reservations',
  'reservation:status'
]

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) return []
  return [...new Set(permissions.filter((c) => ALL_PERMISSION_CODES.includes(c)))]
}

function getEffectivePermissions(user) {
  if (!user) return []
  if (user.restaurantId) return [...MERCHANT_PERMISSION_CODES]
  if (user.isSuper) return [...ALL_PERMISSION_CODES]
  return normalizePermissions(user.permissions)
}

function hasPermission(user, code) {
  if (!user) return false
  if (user.isSuper) return true
  return getEffectivePermissions(user).includes(code)
}

function filterPermissionTree(nodes, allow) {
  const out = []
  for (const node of nodes) {
    const children = node.children?.length ? filterPermissionTree(node.children, allow) : []
    if (allow.has(node.code) || children.length) {
      out.push(children.length ? { ...node, children } : { ...node })
    }
  }
  return out
}

function getPermissionTreeForUser(user) {
  if (user?.restaurantId) {
    return filterPermissionTree(PERMISSION_TREE, new Set(MERCHANT_PERMISSION_CODES))
  }
  return PERMISSION_TREE
}

module.exports = {
  PERMISSION_TREE,
  ALL_PERMISSION_CODES,
  MERCHANT_PERMISSION_CODES,
  normalizePermissions,
  getEffectivePermissions,
  hasPermission,
  getPermissionTreeForUser
}

if (require.main === module) {
  const assert = require('assert')
  const tree = getPermissionTreeForUser({ restaurantId: 1 })
  const codes = []
  const walk = (nodes) => {
    for (const n of nodes) {
      codes.push(n.code)
      if (n.children) walk(n.children)
    }
  }
  walk(tree)
  assert.ok(!codes.includes('menu:onboarding'))
  assert.ok(codes.includes('menu:restaurants'))
  console.log('ok')
}
