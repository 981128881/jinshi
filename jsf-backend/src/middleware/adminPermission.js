const { fail } = require('../utils/response')
const { hasPermission } = require('../constants/adminPermissions')

function requirePermission(...codes) {
  return (req, res, next) => {
    const admin = req.admin
    if (!admin) {
      return fail(res, 401, '请先登录', 401)
    }
    if (admin.isSuper) return next()
    const ok = codes.some((code) => hasPermission(admin, code))
    if (!ok) {
      return fail(res, 403, '无操作权限', 403)
    }
    next()
  }
}

module.exports = { requirePermission }
