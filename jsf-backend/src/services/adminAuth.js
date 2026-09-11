const crypto = require('crypto')
const config = require('../config')
const { signToken, verifyToken } = require('../utils/jwt')
const { cacheSet, cacheGet, cacheDel, isRedisReady } = require('../db/redis')
const { getAdminProfile } = require('./adminUser')
const { getEffectivePermissions } = require('../constants/adminPermissions')

/** @type {Map<string, object>} */
const memoryRefreshStore = new Map()

const REFRESH_PREFIX = 'admin:refresh:'

function expiresInToSeconds(value) {
  if (typeof value === 'number') return value
  const str = String(value)
  if (/^\d+$/.test(str)) return Number(str)
  const match = str.match(/^(\d+)([smhd])$/)
  if (!match) return 7 * 24 * 3600
  const units = { s: 1, m: 60, h: 3600, d: 86400 }
  return Number(match[1]) * units[match[2]]
}

function refreshTtlSeconds() {
  return expiresInToSeconds(config.admin.refreshExpiresIn)
}

async function storeRefreshToken(jti, session) {
  const ttl = refreshTtlSeconds()
  if (isRedisReady()) {
    await cacheSet(`${REFRESH_PREFIX}${jti}`, session, ttl)
    return
  }
  memoryRefreshStore.set(jti, {
    ...session,
    expireAt: Date.now() + ttl * 1000
  })
}

async function getRefreshSession(jti) {
  if (isRedisReady()) {
    return cacheGet(`${REFRESH_PREFIX}${jti}`)
  }
  const entry = memoryRefreshStore.get(jti)
  if (!entry) return null
  if (Date.now() > entry.expireAt) {
    memoryRefreshStore.delete(jti)
    return null
  }
  const { expireAt, ...rest } = entry
  return rest
}

async function revokeRefreshToken(jti) {
  if (!jti) return
  if (isRedisReady()) {
    await cacheDel(`${REFRESH_PREFIX}${jti}`)
    return
  }
  memoryRefreshStore.delete(jti)
}

function buildTokenPair(adminUser) {
  const jti = crypto.randomUUID()
  const username = adminUser.username
  const adminId = adminUser.id
  const isSuper = !!adminUser.isSuper
  const accessToken = signToken(
    { role: 'admin', username, adminId, isSuper, type: 'access' },
    config.admin.accessExpiresIn
  )
  const refreshToken = signToken(
    { role: 'admin', username, adminId, isSuper, type: 'refresh', jti },
    config.admin.refreshExpiresIn
  )
  return { jti, accessToken, refreshToken, username, adminId, isSuper }
}

function buildLoginPayload(adminUser) {
  const restaurantId = adminUser.restaurantId || null
  return {
    username: adminUser.username,
    nickname: adminUser.nickname || adminUser.username,
    adminId: adminUser.id,
    isSuper: !!adminUser.isSuper && !restaurantId,
    orgType: restaurantId ? 'restaurant' : 'platform',
    restaurantId,
    restaurantName: adminUser.restaurantName || adminUser.restaurant?.name || null,
    permissions: getEffectivePermissions(adminUser)
  }
}

async function issueAdminTokens(adminUser) {
  const { jti, accessToken, refreshToken } = buildTokenPair(adminUser)
  const payload = buildLoginPayload(adminUser)
  await storeRefreshToken(jti, {
    username: adminUser.username,
    adminId: adminUser.id,
    orgType: payload.orgType,
    restaurantId: payload.restaurantId
  })
  return {
    accessToken,
    refreshToken,
    token: accessToken,
    expiresIn: config.admin.accessExpiresIn,
    ...payload
  }
}

async function refreshAdminTokens(refreshToken) {
  const payload = verifyToken(refreshToken)
  if (payload.type !== 'refresh' || !payload.jti) {
    throw new Error('invalid refresh token')
  }

  const session = await getRefreshSession(payload.jti)
  if (!session || session.username !== payload.username) {
    throw new Error('refresh token revoked')
  }

  await revokeRefreshToken(payload.jti)

  if (payload.role !== 'admin') {
    throw new Error('invalid refresh token')
  }

  const profile = await getAdminProfile(payload.username)
  if (!profile) {
    throw new Error('admin disabled')
  }

  return issueAdminTokens(profile)
}

async function revokeAdminRefreshToken(refreshToken) {
  try {
    const payload = verifyToken(refreshToken)
    if (payload.type === 'refresh' && payload.jti) {
      await revokeRefreshToken(payload.jti)
    }
  } catch {
    /* ignore */
  }
}

module.exports = {
  issueAdminTokens,
  refreshAdminTokens,
  revokeAdminRefreshToken,
  getAdminProfile,
  buildLoginPayload
}
