const crypto = require('crypto')
const config = require('../config')
const prisma = require('../db/prisma')
const { signToken, verifyToken } = require('../utils/jwt')
const { cacheSet, cacheGet, cacheDel, isRedisReady } = require('../db/redis')
const { getAdminProfile } = require('./adminUser')
const { getEffectivePermissions, ORG_PERMISSION_CODES } = require('../constants/adminPermissions')
const { verifyPassword } = require('../utils/password')

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
  const permissions = getEffectivePermissions(adminUser)
  return {
    username: adminUser.username,
    nickname: adminUser.nickname || adminUser.username,
    adminId: adminUser.id,
    isSuper: !!adminUser.isSuper,
    orgType: 'platform',
    restaurantId: null,
    restaurantName: null,
    permissions
  }
}

async function issueAdminTokens(adminUser) {
  const { jti, accessToken, refreshToken } = buildTokenPair(adminUser)
  await storeRefreshToken(jti, { username: adminUser.username, adminId: adminUser.id, orgType: 'platform' })
  return {
    accessToken,
    refreshToken,
    token: accessToken,
    expiresIn: config.admin.accessExpiresIn,
    ...buildLoginPayload(adminUser)
  }
}

function buildMerchantAdminTokenPair(account, restaurant) {
  const jti = crypto.randomUUID()
  const username = account.username
  const accountId = account.id
  const restaurantId = account.restaurantId
  const accessToken = signToken(
    {
      role: 'merchant_admin',
      username,
      accountId,
      restaurantId,
      orgType: 'restaurant',
      type: 'access'
    },
    config.admin.accessExpiresIn
  )
  const refreshToken = signToken(
    {
      role: 'merchant_admin',
      username,
      accountId,
      restaurantId,
      orgType: 'restaurant',
      type: 'refresh',
      jti
    },
    config.admin.refreshExpiresIn
  )
  return { jti, accessToken, refreshToken, username, accountId, restaurantId, restaurant }
}

function buildMerchantAdminLoginPayload(account, restaurant) {
  return {
    username: account.username,
    nickname: restaurant?.name || account.username,
    adminId: account.id,
    accountId: account.id,
    isSuper: false,
    orgType: 'restaurant',
    restaurantId: account.restaurantId,
    restaurantName: restaurant?.name || '',
    permissions: [...ORG_PERMISSION_CODES]
  }
}

async function issueMerchantAdminTokens(account, restaurant) {
  const { jti, accessToken, refreshToken } = buildMerchantAdminTokenPair(account, restaurant)
  await storeRefreshToken(jti, {
    username: account.username,
    accountId: account.id,
    restaurantId: account.restaurantId,
    orgType: 'restaurant'
  })
  return {
    accessToken,
    refreshToken,
    token: accessToken,
    expiresIn: config.admin.accessExpiresIn,
    ...buildMerchantAdminLoginPayload(account, restaurant)
  }
}

/** 店主账号登录（MerchantAppAccount） */
async function authenticateMerchantAdmin(username, password) {
  const name = String(username || '').trim()
  const pwd = String(password || '')
  if (!name || !pwd) return null

  const account = await prisma.merchantAppAccount.findUnique({
    where: { username: name },
    include: { restaurant: true }
  })
  if (!account || !account.enabled) return null
  if (!verifyPassword(pwd, account.password)) return null
  if (!account.restaurant || account.restaurant.status === 'disabled') return null
  return account
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

  if (payload.role === 'merchant_admin' || session.orgType === 'restaurant') {
    const account = await prisma.merchantAppAccount.findUnique({
      where: { id: session.accountId || payload.accountId },
      include: { restaurant: true }
    })
    if (!account || !account.enabled) throw new Error('account disabled')
    return issueMerchantAdminTokens(account, account.restaurant)
  }

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

async function getMerchantAdminProfile(accountId) {
  const account = await prisma.merchantAppAccount.findUnique({
    where: { id: accountId },
    include: { restaurant: true }
  })
  if (!account || !account.enabled) return null
  return {
    id: account.id,
    username: account.username,
    nickname: account.restaurant?.name || account.username,
    enabled: true,
    isSuper: false,
    orgType: 'restaurant',
    restaurantId: account.restaurantId,
    restaurantName: account.restaurant?.name || '',
    permissions: [...ORG_PERMISSION_CODES]
  }
}

module.exports = {
  issueAdminTokens,
  issueMerchantAdminTokens,
  authenticateMerchantAdmin,
  refreshAdminTokens,
  revokeAdminRefreshToken,
  getAdminProfile,
  getMerchantAdminProfile,
  buildLoginPayload
}
