const prisma = require('../db/prisma')
const { verifyToken } = require('../utils/jwt')
const { fail } = require('../utils/response')
const { getEffectivePermissions } = require('../constants/adminPermissions')

async function adminRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return fail(res, 401, '请先登录', 401)
  }
  try {
    const payload = verifyToken(token)
    if (payload.type && payload.type !== 'access') {
      return fail(res, 401, '登录已过期', 401)
    }

    if (payload.role !== 'admin') {
      return fail(res, 403, '无管理权限', 403)
    }

    const row = await prisma.adminUser.findUnique({
      where: { username: payload.username },
      select: {
        id: true,
        username: true,
        nickname: true,
        enabled: true,
        isSuper: true,
        permissions: true,
        restaurantId: true
      }
    })
    if (!row || !row.enabled) {
      return fail(res, 401, '账号已禁用或不存在', 401)
    }
    req.admin = {
      id: row.id,
      username: row.username,
      nickname: row.nickname,
      isSuper: !!row.isSuper && !row.restaurantId,
      orgType: row.restaurantId ? 'restaurant' : 'platform',
      role: 'admin',
      restaurantId: row.restaurantId || null,
      permissions: getEffectivePermissions(row)
    }
    next()
  } catch (e) {
    return fail(res, 401, '登录已过期', 401)
  }
}

/** 门店账号只能访问自己的 restaurantId */
function assertOrgRestaurantAccess(req, restaurantId) {
  const mine = req.admin?.restaurantId
  if (!mine) return true
  return Number(mine) === Number(restaurantId)
}

module.exports = {
  adminRequired,
  assertOrgRestaurantAccess
}
