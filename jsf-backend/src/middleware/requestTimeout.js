const { fail } = require('../utils/response')
const { createLogger } = require('../utils/logger')

const log = createLogger('timeout')
const DEFAULT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30000

function requestTimeout(ms = DEFAULT_MS) {
  return (req, res, next) => {
    if (req.skipRequestTimeout) return next()

    const timer = setTimeout(() => {
      if (res.headersSent) return
      log.warn(`${req.method} ${req.originalUrl || req.url} 超时 ${ms}ms`, {
        method: req.method,
        url: req.originalUrl || req.url,
        timeoutMs: ms
      })
      fail(res, 504, '请求超时，请稍后重试', 504)
    }, ms)

    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))
    next()
  }
}

module.exports = { requestTimeout }
