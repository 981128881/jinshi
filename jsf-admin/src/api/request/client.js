import axios from 'axios'
import { ElMessage } from 'element-plus'
import config from '@/config'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import {
  BizError,
  CancelError,
  HttpError,
  httpStatusMessage,
  isCancelled
} from './errors.js'
import { getToken, onTokenChange } from './token.js'
import { showLoading, hideLoading } from './loading.js'
import {
  buildRequestKey,
  getPendingRequest,
  setPendingRequest,
  clearPendingRequest
} from './dedup.js'
import {
  abortByCancelKey,
  registerCancelKey,
  unregisterCancelKey,
  registerPageAbort,
  unregisterPageAbort
} from './cancel.js'
import { shouldRetry, getRetryOptions, sleep } from './retry.js'
import { getCache, setCache, resolveCacheTtl } from './cache.js'
import { nextRequestId, logRequestStart, logRequestSuccess, logRequestError } from './observe.js'

/** @type {import('axios').AxiosInstance} */
const client = axios.create({
  baseURL: config.baseUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * @param {import('./types.js').RequestConfig} reqConfig
 */
function applyDefaults(reqConfig) {
  if (reqConfig.showError === undefined) reqConfig.showError = true
  if (reqConfig.requireAuth === undefined) {
    reqConfig.requireAuth = reqConfig.auth !== false
  }
  if (reqConfig.skipRefresh === undefined) reqConfig.skipRefresh = false
  if (reqConfig.loading === undefined) reqConfig.loading = false
  if (reqConfig.loadingText === undefined) reqConfig.loadingText = '加载中...'
  if (reqConfig.dedup === undefined) reqConfig.dedup = false
  if (reqConfig.retry === undefined) reqConfig.retry = false
  if (reqConfig.cache === undefined) reqConfig.cache = false
  delete reqConfig.auth
  return reqConfig
}

function resolveAuthToken() {
  const token = getToken()
  if (token) return token
  try {
    return useUserStore().token || ''
  } catch {
    return ''
  }
}

function applyDefaultAuthHeader(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete client.defaults.headers.common.Authorization
  }
}

onTokenChange(applyDefaultAuthHeader)
applyDefaultAuthHeader(getToken())

function handleUnauthorized(message) {
  const userStore = useUserStore()
  userStore.logout()
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
  ElMessage.error(message || '登录已过期，请重新登录')
}

async function tryRefreshAndRetry(reqConfig) {
  if (
    reqConfig.skipRefresh ||
    reqConfig.__isRetryAfterRefresh ||
    reqConfig.requireAuth === false
  ) {
    return null
  }

  const { refreshAccessToken } = await import('./refresh.js')
  try {
    await refreshAccessToken()
    reqConfig.__isRetryAfterRefresh = true
    delete reqConfig.headers?.Authorization
    return client(reqConfig)
  } catch {
    return null
  }
}

/**
 * @param {import('axios').AxiosResponse} response
 * @param {import('./types.js').RequestConfig} reqConfig
 */
function parseEnvelope(response, reqConfig) {
  const body = response.data

  if (response.config.responseType === 'blob') {
    return body
  }

  if (!body || typeof body !== 'object' || !('code' in body)) {
    return body
  }

  const { code, data, message, msg } = body
  const errMsg = message || msg || '请求失败'

  if (config.successCode.includes(code)) {
    return data !== undefined ? data : body
  }

  if (code === 401) {
    throw new BizError(code, errMsg, body)
  }

  if (reqConfig.showError) {
    ElMessage.error(errMsg)
  }
  throw new BizError(code, errMsg, body)
}

client.interceptors.request.use((rawConfig) => {
  const reqConfig = applyDefaults(rawConfig)

  reqConfig.__requestId = nextRequestId()
  reqConfig.__startTime = Date.now()
  reqConfig.headers = reqConfig.headers || {}
  reqConfig.headers['X-Request-Id'] = reqConfig.__requestId

  if (reqConfig.requireAuth !== false && !reqConfig.skipAuth) {
    const token = resolveAuthToken()
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`
    }
  }

  if (reqConfig.loading) {
    showLoading(reqConfig.loadingText)
    reqConfig.__loading = true
  }

  if (reqConfig.cancelKey) {
    abortByCancelKey(reqConfig.cancelKey)
  }

  const controller = new AbortController()
  const previousSignal = reqConfig.signal
  if (previousSignal) {
    if (previousSignal.aborted) {
      controller.abort()
    } else {
      previousSignal.addEventListener('abort', () => controller.abort())
    }
  }
  reqConfig.signal = controller.signal

  const abort = () => controller.abort()
  reqConfig.__abort = abort
  if (reqConfig.__abortHolder) reqConfig.__abortHolder.current = abort

  if (reqConfig.cancelKey) registerCancelKey(reqConfig.cancelKey, abort)
  if (reqConfig.pageId) registerPageAbort(reqConfig.pageId, abort)

  reqConfig.__cleanup = () => {
    if (reqConfig.__loading) hideLoading()
    if (reqConfig.pageId) unregisterPageAbort(reqConfig.pageId, abort)
    if (reqConfig.cancelKey) unregisterCancelKey(reqConfig.cancelKey, abort)
  }

  logRequestStart(reqConfig)
  delete reqConfig.auth
  return reqConfig
})

client.interceptors.response.use(
  async (response) => {
    const reqConfig = response.config
    const duration = Date.now() - (reqConfig.__startTime || Date.now())

    const body = response.data
    if (
      body &&
      typeof body === 'object' &&
      body.code === 401 &&
      reqConfig.requireAuth !== false &&
      !reqConfig.skipRefresh
    ) {
      const retried = await tryRefreshAndRetry(reqConfig)
      if (retried) {
        reqConfig.__cleanup?.()
        return retried
      }
    }

    try {
      const result = parseEnvelope(response, reqConfig)

      const cacheTtl = resolveCacheTtl(reqConfig.cache)
      if (cacheTtl > 0 && reqConfig.__cacheKey) {
        setCache(reqConfig.__cacheKey, result, cacheTtl)
      }

      logRequestSuccess(reqConfig, result, duration)
      return result
    } catch (e) {
      if (e instanceof BizError && e.code === 401 && reqConfig.requireAuth !== false) {
        const retried = await tryRefreshAndRetry(reqConfig)
        if (retried) return retried
        if (reqConfig.showError) handleUnauthorized(e.message)
      }
      throw e
    } finally {
      reqConfig.__cleanup?.()
    }
  },
  async (error) => {
    const reqConfig = error.config || {}
    const duration = Date.now() - (reqConfig.__startTime || Date.now())
    reqConfig.__cleanup?.()

    if (isCancelled(error) || axios.isCancel(error)) {
      logRequestError(reqConfig, error, duration)
      return Promise.reject(new CancelError())
    }

    if (shouldRetry(error, reqConfig)) {
      reqConfig.__retryCount = reqConfig.__retryCount || 0
      const { count, delay } = getRetryOptions(reqConfig)
      if (reqConfig.__retryCount < count) {
        reqConfig.__retryCount += 1
        await sleep(delay * reqConfig.__retryCount)
        return client(reqConfig)
      }
    }

    const showError = reqConfig.showError !== false
    const status = error.response?.status
    const body = error.response?.data
    const bodyMsg = body?.message || body?.msg

    if (status === 401) {
      const retried = await tryRefreshAndRetry(reqConfig)
      if (retried) return retried
      if (showError) {
        if (reqConfig.requireAuth !== false) handleUnauthorized(bodyMsg)
        else ElMessage.error(bodyMsg || '用户名或密码错误')
      }
      logRequestError(reqConfig, error, duration)
      return Promise.reject(new HttpError(401, bodyMsg || httpStatusMessage(401), body))
    }

    if (status) {
      const msg = bodyMsg || httpStatusMessage(status, error.message)
      if (showError) ElMessage.error(msg)
      logRequestError(reqConfig, error, duration)
      return Promise.reject(new HttpError(status, msg, body))
    }

    const msg = bodyMsg || error.message || '网络异常，请稍后重试'
    if (showError) ElMessage.error(msg)
    logRequestError(reqConfig, error, duration)
    return Promise.reject(error)
  }
)

/**
 * @param {string} url
 * @param {import('axios').AxiosRequestConfig & import('./types.js').RequestOptions} [configOrOptions]
 */
function wrapRequest(url, configOrOptions = {}) {
  const method = (configOrOptions.method || 'GET').toUpperCase()
  const dedupKey =
    configOrOptions.dedup === true
      ? buildRequestKey(method, url, configOrOptions.params, configOrOptions.data)
      : typeof configOrOptions.dedup === 'string'
        ? configOrOptions.dedup
        : ''

  const cacheTtl = resolveCacheTtl(configOrOptions.cache)
  const cacheKey = cacheTtl > 0 && method === 'GET' ? dedupKey || buildRequestKey(method, url, configOrOptions.params, configOrOptions.data) : ''

  if (cacheKey) {
    const cached = getCache(cacheKey)
    if (cached !== undefined) {
      return Promise.resolve(cached)
    }
  }

  if (dedupKey) {
    const pending = getPendingRequest(dedupKey)
    if (pending) {
      if (configOrOptions.dedup === 'ignore') return pending.promise
      try {
        pending.abort()
      } catch (e) {
        /* ignore */
      }
    }
  }

  /** @type {{ current: (() => void) | null }} */
  const abortHolder = { current: null }

  const promise = client({
    url,
    ...configOrOptions,
    __abortHolder: abortHolder,
    __cacheKey: cacheKey || undefined
  })

  if (dedupKey) {
    const entry = {
      abort: () => abortHolder.current?.(),
      promise
    }
    setPendingRequest(dedupKey, entry)
    promise.finally(() => clearPendingRequest(dedupKey, entry.abort))
  }

  return promise
}

export function request(options) {
  return wrapRequest(options.url, options)
}

export function get(url, config = {}) {
  return wrapRequest(url, { ...config, method: 'GET' })
}

export function post(url, data, config = {}) {
  return wrapRequest(url, { ...config, method: 'POST', data })
}

export function put(url, data, config = {}) {
  return wrapRequest(url, { ...config, method: 'PUT', data })
}

export function del(url, config = {}) {
  return wrapRequest(url, { ...config, method: 'DELETE' })
}

export default client
