const { fail } = require('../utils/response')
const { hasPermission, isOrgAdmin } = require('../constants/adminPermissions')

function requirePermission(...codes) {
  return (req, res, next) => {
    const admin = req.admin
    if (!admin) {
      return fail(res, 401, '请先登录', 401)
    }
    // 平台超管放行；门店组织账号必须走权限码校验
    if (admin.isSuper && !isOrgAdmin(admin)) return next()
    const ok = codes.some((code) => hasPermission(admin, code))
    if (!ok) {
      return fail(res, 403, '无操作权限', 403)
    }
    next()
  }
}

module.exports = { requirePermission }
