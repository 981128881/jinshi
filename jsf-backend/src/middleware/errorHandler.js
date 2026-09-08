const { fail } = require('../utils/response')
const { createLogger } = require('../utils/logger')

const log = createLogger('error')

function errorHandler(err, req, res, next) {
  log.error(`${req.method} ${req.originalUrl || req.url}`, err)
  if (res.headersSent) return next(err)
  const message = err.message || '服务器错误'
  // 微信 errcode（如 40029）不是 HTTP 状态码，需落回 500/400
  const raw = err.statusCode || err.code
  const isHttp = typeof raw === 'number' && raw >= 400 && raw <= 599
  const httpStatus = isHttp ? raw : 500
  const bizCode = isHttp ? raw : 500
  return fail(res, bizCode, message, httpStatus)
}

function notFound(req, res) {
  log.warn(`接口不存在 ${req.method} ${req.path}`, { type: 'not_found' })
  return fail(res, 404, `接口不存在: ${req.method} ${req.path}`, 404)
}

module.exports = { errorHandler, notFound }
