import config from '@/config'
import { createLogger } from '@/utils/logger'

const log = createLogger('api')

let requestSeq = 0

export function nextRequestId() {
  requestSeq += 1
  return `req-${Date.now()}-${requestSeq}`
}

/**
 * @param {import('./types.js').RequestConfig} reqConfig
 */
export function logRequestStart(reqConfig) {
  if (!config.observe.enabled) return
  const method = (reqConfig.method || 'GET').toUpperCase()
  const url = reqConfig.url
  log.debug(`→ ${method} ${url}`, {
    id: reqConfig.__requestId,
    params: reqConfig.params,
    data: reqConfig.data
  })
}

/**
 * @param {import('./types.js').RequestConfig} reqConfig
 * @param {*} result
 * @param {number} duration
 */
export function logRequestSuccess(reqConfig, result, duration) {
  if (!config.observe.enabled) return
  const method = (reqConfig.method || 'GET').toUpperCase()
  const url = reqConfig.url
  const slow = duration >= config.observe.slowThreshold
  const payload = { id: reqConfig.__requestId, durationMs: duration, result }
  if (slow) {
    log.warn(`← ${method} ${url} ${duration}ms (slow)`, payload)
  } else {
    log.debug(`← ${method} ${url} ${duration}ms`, payload)
  }
}

/**
 * @param {import('./types.js').RequestConfig} reqConfig
 * @param {*} error
 * @param {number} duration
 */
export function logRequestError(reqConfig, error, duration) {
  const method = (reqConfig.method || 'GET').toUpperCase()
  const url = reqConfig.url
  log.error(`✕ ${method} ${url} ${duration}ms`, {
    id: reqConfig.__requestId,
    durationMs: duration,
    error: error?.message || String(error)
  })
}
