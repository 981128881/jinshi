import config from '@/config'

/**
 * @param {*} error
 * @param {import('./types.js').RequestConfig} reqConfig
 */
export function shouldRetry(error, reqConfig) {
  const retryOpt = reqConfig.retry
  if (!retryOpt) return false

  if (error?.cancelled || error?.code === 'ERR_CANCELED') return false

  const retryOn = config.retry.retryOn
  const status = error?.response?.status
  const code = error?.code

  if (retryOn.includes('network') && !error?.response && code !== 'ECONNABORTED') {
    return true
  }
  if (retryOn.includes('timeout') && (code === 'ECONNABORTED' || code === 'ETIMEDOUT')) {
    return true
  }
  if (retryOn.includes('5xx') && status >= 500 && status < 600) {
    return true
  }
  return false
}

/**
 * @param {import('./types.js').RequestConfig} reqConfig
 */
export function getRetryOptions(reqConfig) {
  const retryOpt = reqConfig.retry
  if (typeof retryOpt === 'number') {
    return { count: retryOpt, delay: config.retry.delay }
  }
  if (typeof retryOpt === 'object') {
    return {
      count: retryOpt.count ?? config.retry.count,
      delay: retryOpt.delay ?? config.retry.delay
    }
  }
  return { count: config.retry.count, delay: config.retry.delay }
}

/** @param {number} ms */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
