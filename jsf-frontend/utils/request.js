import config from '../config/index.js'
import { createLogger, nextRequestId } from './logger.js'

const log = createLogger('api')

const TOKEN_KEY = 'token'

/** @type {Map<string, { abort: Function, promise: Promise<any> }>} */
const pendingMap = new Map()
/** @type {Map<string, Set<Function>>} */
const pageAbortMap = new Map()
/** @type {Map<string, Function>} */
const cancelKeyMap = new Map()

function buildUrl(url) {
	if (/^https?:\/\//.test(url)) return url
	const base = config.baseUrl.replace(/\/$/, '')
	const path = url.startsWith('/') ? url : '/' + url
	return base + path
}

function getRequestKey(method, url, data) {
	return `${method}:${url}:${JSON.stringify(data || {})}`
}

export function getToken() {
	return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token) {
	uni.setStorageSync(TOKEN_KEY, token)
}

export function removeToken() {
	uni.removeStorageSync(TOKEN_KEY)
}

/** 页面卸载时取消该页所有请求 */
export function cancelPageRequests(pageId) {
	const set = pageAbortMap.get(pageId)
	if (!set) return
	set.forEach(abort => {
		try { abort() } catch (e) {}
	})
	pageAbortMap.delete(pageId)
}

function registerPageAbort(pageId, abort) {
	if (!pageId) return
	if (!pageAbortMap.has(pageId)) pageAbortMap.set(pageId, new Set())
	pageAbortMap.get(pageId).add(abort)
}

function unregisterAbort(pageId, abort, dedupKey, cancelKey) {
	if (pageId) {
		const set = pageAbortMap.get(pageId)
		if (set) {
			set.delete(abort)
			if (set.size === 0) pageAbortMap.delete(pageId)
		}
	}
	if (dedupKey && pendingMap.get(dedupKey)?.abort === abort) {
		pendingMap.delete(dedupKey)
	}
	if (cancelKey && cancelKeyMap.get(cancelKey) === abort) {
		cancelKeyMap.delete(cancelKey)
	}
}

function handleUnauthorized(message) {
	removeToken()
	uni.showToast({
		title: message || '登录已过期，请重新登录',
		icon: 'none'
	})
}

function isAbortedError(err) {
	if (!err) return false
	if (err.cancelled) return true
	const msg = err.errMsg || err.message || ''
	return msg.includes('abort') || msg.includes('cancel')
}

function parseResponse(res, options) {
	const { statusCode, data: body } = res
	const { showError, silent401 } = options

	// 304 无响应体时视为失败（小程序本地缓存不可靠）；有 body 则继续解析
	if (statusCode === 304 && (body == null || body === '')) {
		const msg = '请求失败(304)'
		if (showError) uni.showToast({ title: msg, icon: 'none' })
		return Promise.reject({ code: 304, message: msg, data: body })
	}

	if ((statusCode < 200 || statusCode >= 300) && statusCode !== 304) {
		const msg = `请求失败(${statusCode})`
		if (showError) uni.showToast({ title: msg, icon: 'none' })
		return Promise.reject({ code: statusCode, message: msg, data: body })
	}

	if (!body || typeof body !== 'object' || !('code' in body)) {
		return Promise.resolve(body)
	}

	const { code, data, message, msg } = body
	const errMsg = message || msg || '请求失败'

	if (config.successCode.includes(code)) {
		return Promise.resolve(data !== undefined ? data : body)
	}

	if (code === 401) {
		if (!silent401) handleUnauthorized(errMsg)
		return Promise.reject(body)
	}

	if (showError) uni.showToast({ title: errMsg, icon: 'none' })
	return Promise.reject(body)
}

/**
 * @param {Object} options
 * @param {string} [options.pageId] - 页面 ID，卸载时自动取消
 * @param {string} [options.cancelKey] - 取消键，新请求会 abort 同 key 旧请求（搜索/筛选）
 * @param {boolean|string} [options.dedup=false] - true 或 key 时去重；'ignore' 返回进行中的 promise
 */
export function request(options = {}) {
	const {
		url,
		method = 'GET',
		data = {},
		header = {},
		loading = false,
		loadingText = '加载中...',
		showError = true,
		auth = true,
		silent401 = false,
		pageId,
		cancelKey,
		dedup = false,
		...rest
	} = options

	if (!url) return Promise.reject(new Error('request: url is required'))

	const dedupKey = dedup === true ? getRequestKey(method, url, data) : (typeof dedup === 'string' ? dedup : '')

	if (cancelKey && cancelKeyMap.has(cancelKey)) {
		try { cancelKeyMap.get(cancelKey)() } catch (e) {}
		cancelKeyMap.delete(cancelKey)
	}

	if (dedupKey && pendingMap.has(dedupKey)) {
		const prev = pendingMap.get(dedupKey)
		if (dedup === 'ignore') return prev.promise
		try { prev.abort() } catch (e) {}
		pendingMap.delete(dedupKey)
	}

	if (loading) uni.showLoading({ title: loadingText, mask: true })

	const requestId = nextRequestId()
	const startTime = Date.now()
	const fullUrl = buildUrl(url)
	log.debug(`→ ${method} ${url}`, { id: requestId, data })

	const token = auth ? getToken() : ''
	const reqHeader = {
		'Content-Type': 'application/json',
		...header
	}
	if (token) reqHeader.Authorization = `Bearer ${token}`

	let task = null
	let aborted = false

	const abort = () => {
		if (aborted) return
		aborted = true
		if (task && typeof task.abort === 'function') task.abort()
	}

	if (cancelKey) cancelKeyMap.set(cancelKey, abort)

	const promise = new Promise((resolve, reject) => {
		task = uni.request({
			url: fullUrl,
			method,
			data,
			header: reqHeader,
			timeout: config.timeout,
			...rest,
			success(res) {
				const duration = Date.now() - startTime
				if (aborted) {
					reject({ cancelled: true, message: 'request cancelled' })
					return
				}
				parseResponse(res, { showError, silent401 })
					.then((result) => {
						if (duration >= 3000) {
							log.warn(`← ${method} ${url} ${duration}ms (slow)`, { id: requestId, status: res.statusCode })
						} else {
							log.debug(`← ${method} ${url} ${duration}ms`, { id: requestId, status: res.statusCode })
						}
						resolve(result)
					})
					.catch((err) => {
						log.error(`✕ ${method} ${url} ${duration}ms`, { id: requestId, error: err?.message || err })
						reject(err)
					})
			},
			fail(err) {
				const duration = Date.now() - startTime
				if (aborted || isAbortedError(err)) {
					reject({ cancelled: true, message: 'request cancelled', ...err })
					return
				}
				const errMsg = err?.errMsg || err?.message || ''
				log.error(`✕ ${method} ${url} ${duration}ms`, { id: requestId, error: errMsg, fullUrl })
				if (showError) {
					// 开发环境展示具体原因，便于排查域名校验/证书/后端不通
					let tip = '网络异常，请稍后重试'
					if (!import.meta.env.PROD) {
						if (/url not in domain|合法域名|domain list/i.test(errMsg)) {
							tip = '请求域名未配置，请勾选「不校验合法域名」'
						} else if (/timeout/i.test(errMsg)) {
							tip = '请求超时，请检查后端服务'
						} else if (/fail|ERR_|refused|connect/i.test(errMsg)) {
							tip = '无法连接服务器，请检查网络与接口地址'
						}
					}
					uni.showToast({ title: tip, icon: 'none', duration: 2500 })
				}
				reject(err)
			},
			complete() {
				unregisterAbort(pageId, abort, dedupKey, cancelKey)
				if (loading) uni.hideLoading()
			}
		})

		registerPageAbort(pageId, abort)
	})

	if (dedupKey) pendingMap.set(dedupKey, { abort, promise })

	return promise
}

export function get(url, data = {}, options = {}) {
	return request({ url, method: 'GET', data, ...options })
}

export function post(url, data = {}, options = {}) {
	return request({ url, method: 'POST', data, ...options })
}

export function put(url, data = {}, options = {}) {
	return request({ url, method: 'PUT', data, ...options })
}
