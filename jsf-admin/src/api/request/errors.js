/** @typedef {'http' | 'biz' | 'network' | 'cancel' | 'timeout'} ErrorType */

export class RequestError extends Error {
  /**
   * @param {string} message
   * @param {{ type?: ErrorType, code?: number, data?: *, raw?: * }} [options]
   */
  constructor(message, options = {}) {
    super(message)
    this.name = 'RequestError'
    this.type = options.type || 'network'
    this.code = options.code
    this.data = options.data
    this.raw = options.raw
  }
}

export class HttpError extends RequestError {
  /**
   * @param {number} status
   * @param {string} message
   * @param {*} [data]
   */
  constructor(status, message, data) {
    super(message, { type: 'http', code: status, data })
    this.name = 'HttpError'
    this.status = status
  }
}

export class BizError extends RequestError {
  /**
   * @param {number} code
   * @param {string} message
   * @param {*} [data]
   */
  constructor(code, message, data) {
    super(message, { type: 'biz', code, data })
    this.name = 'BizError'
  }
}

export class CancelError extends RequestError {
  constructor(message = 'request cancelled') {
    super(message, { type: 'cancel', code: 0 })
    this.name = 'CancelError'
    this.cancelled = true
  }
}

const HTTP_STATUS_MSG = {
  400: '请求参数错误',
  403: '没有访问权限',
  404: '资源不存在',
  408: '请求超时',
  429: '请求过于频繁',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂不可用'
}

/**
 * @param {number} status
 * @param {string} [fallback]
 */
export function httpStatusMessage(status, fallback) {
  return HTTP_STATUS_MSG[status] || fallback || `请求失败(${status})`
}

/**
 * @param {*} err
 */
export function isCancelled(err) {
  if (!err) return false
  if (err instanceof CancelError || err.cancelled) return true
  if (err.code === 'ERR_CANCELED') return true
  const msg = err.message || ''
  return msg.includes('abort') || msg.includes('cancel')
}

/**
 * @param {*} err
 */
export function isRequestError(err) {
  return err instanceof RequestError
}

/**
 * @param {*} err
 */
export function isUnauthorized(err) {
  if (err instanceof HttpError) return err.status === 401
  if (err instanceof BizError) return err.code === 401
  return err?.code === 401 || err?.response?.status === 401
}
