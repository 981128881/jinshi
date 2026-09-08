const { verifyToken } = require('../utils/jwt')
const { fail } = require('../utils/response')

/** 商家 App JWT 鉴权：req.merchantApp = { accountId, restaurantId, username } */
function merchantAppRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return fail(res, 401, '请先登录', 401)
  }
  try {
    const payload = verifyToken(token)
    if (payload.role !== 'merchant_app') {
      return fail(res, 403, '无商家 App 权限', 403)
    }
    if (payload.type && payload.type !== 'access') {
      return fail(res, 401, '登录已过期', 401)
    }
    if (!payload.restaurantId) {
      return fail(res, 401, '登录已过期', 401)
    }
    req.merchantApp = {
      accountId: payload.accountId,
      restaurantId: Number(payload.restaurantId),
      username: payload.username
    }
    next()
  } catch {
    return fail(res, 401, '登录已过期', 401)
  }
}

function verifyMerchantAppToken(token) {
  const payload = verifyToken(token)
  if (payload.role !== 'merchant_app') throw new Error('forbidden')
  if (payload.type && payload.type !== 'access') throw new Error('invalid token type')
  if (!payload.restaurantId) throw new Error('missing restaurant')
  return {
    accountId: payload.accountId,
    restaurantId: Number(payload.restaurantId),
    username: payload.username
  }
}

module.exports = { merchantAppRequired, verifyMerchantAppToken }
