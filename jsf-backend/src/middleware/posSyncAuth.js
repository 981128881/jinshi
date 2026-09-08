const config = require('../config')
const { fail } = require('../utils/response')

function posSyncAuth(req, res, next) {
  const token = config.posSync.token
  if (!token) {
    return fail(res, 503, 'POS 同步未配置 POS_SYNC_TOKEN', 503)
  }
  const header = req.headers.authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (bearer !== token) {
    return fail(res, 401, '同步 Token 无效', 401)
  }
  next()
}

module.exports = { posSyncAuth }
