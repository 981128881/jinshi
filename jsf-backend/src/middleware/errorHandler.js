const { fail } = require('../utils/response')
const { createLogger } = require('../utils/logger')

const log = createLogger('error')

function errorHandler(err, req, res, next) {
  log.error(`${req.method} ${req.originalUrl || req.url}`, err)
  if (res.headersSent) return next(err)
  const raw = err.statusCode || err.code
  const isHttp = typeof raw === 'number' && raw >= 400 && raw <= 599
  const httpStatus = isHttp ? raw : 500
  const bizCode = isHttp ? raw : 500
  const message = isHttp ? (err.message || '请求失败') : '服务器错误'
  return fail(res, bizCode, message, httpStatus)
}

function notFound(req, res) {
  log.warn(`接口不存在 ${req.method} ${req.path}`, { type: 'not_found' })
  return fail(res, 404, `接口不存在: ${req.method} ${req.path}`, 404)
}

module.exports = { errorHandler, notFound }
