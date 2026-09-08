const prisma = require('../db/prisma')
const { verifyToken } = require('../utils/jwt')
const { fail } = require('../utils/response')
const {
  getEffectivePermissions,
  ORG_PERMISSION_CODES,
  isOrgAdmin
} = require('../constants/adminPermissions')

const CACHE_TTL_MS = 5 * 60 * 1000
/** @type {Map<string, { user: object, at: number }>} */
const adminCache = new Map()

function cacheKey(payload) {
  if (payload.role === 'merchant_admin') return `org:${payload.accountId}`
  return `admin:${payload.username}`
}

function getCachedAdmin(key) {
  const hit = adminCache.get(key)
  if (!hit || Date.now() - hit.at > CACHE_TTL_MS) return null
  return hit.user
}

function setCachedAdmin(key, user) {
  adminCache.set(key, { user, at: Date.now() })
}

function invalidateAdminCache(username) {
  if (username) {
    adminCache.delete(`admin:${username}`)
    adminCache.delete(`org:${username}`)
  } else {
    adminCache.clear()
  }
}

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

    if (payload.role === 'merchant_admin') {
      const key = cacheKey(payload)
      let user = getCachedAdmin(key)
      if (!user) {
        const row = await prisma.merchantAppAccount.findUnique({
          where: { id: payload.accountId },
          include: { restaurant: { select: { id: true, name: true, status: true } } }
        })
        if (!row || !row.enabled) {
          return fail(res, 401, '账号已禁用或不存在', 401)
        }
        if (!row.restaurant || row.restaurant.status === 'disabled') {
          return fail(res, 403, '门店已停用', 403)
        }
        user = {
          id: row.id,
          username: row.username,
          nickname: row.restaurant.name || row.username,
          isSuper: false,
          orgType: 'restaurant',
          role: 'merchant_admin',
          restaurantId: row.restaurantId,
          restaurantName: row.restaurant.name || '',
          permissions: [...ORG_PERMISSION_CODES]
        }
        setCachedAdmin(key, user)
      }
      req.admin = user
      return next()
    }

    if (payload.role !== 'admin') {
      return fail(res, 403, '无管理权限', 403)
    }

    const key = cacheKey(payload)
    let user = getCachedAdmin(key)
    if (!user) {
      const row = await prisma.adminUser.findUnique({
        where: { username: payload.username },
        select: {
          id: true,
          username: true,
          nickname: true,
          enabled: true,
          isSuper: true,
          permissions: true
        }
      })
      if (!row || !row.enabled) {
        return fail(res, 401, '账号已禁用或不存在', 401)
      }
      user = {
        id: row.id,
        username: row.username,
        nickname: row.nickname,
        isSuper: row.isSuper,
        orgType: 'platform',
        role: 'admin',
        restaurantId: null,
        permissions: getEffectivePermissions(row)
      }
      setCachedAdmin(key, user)
    }

    req.admin = user
    next()
  } catch (e) {
    return fail(res, 401, '登录已过期', 401)
  }
}

/** 门店账号只能访问自己的 restaurantId */
function assertOrgRestaurantAccess(req, restaurantId) {
  if (!isOrgAdmin(req.admin)) return true
  return Number(req.admin.restaurantId) === Number(restaurantId)
}

module.exports = {
  adminRequired,
  invalidateAdminCache,
  assertOrgRestaurantAccess,
  isOrgAdmin
}
