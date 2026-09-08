const { verifyToken } = require('../utils/jwt')
const { fail } = require('../utils/response')

function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    return fail(res, 401, '未登录', 401)
  }
  try {
    const payload = verifyToken(token)
    req.userId = payload.userId
    next()
  } catch (e) {
    return fail(res, 401, '登录已过期，请重新登录', 401)
  }
}

module.exports = { authRequired }
