import { wxSilentLogin, wxPhoneLogin } from '../api/auth.js'
import { getToken } from './request.js'
import { useUserStore } from '../stores/user.js'

function getWxLoginCode() {
	return new Promise((resolve, reject) => {
		uni.login({
			provider: 'weixin',
			success: (res) => {
				if (res.code) resolve(res.code)
				else reject(new Error('获取登录凭证失败'))
			},
			fail: reject
		})
	})
}

/** 解析 JWT payload（仅读 exp，不做签名校验） */
function readJwtExpMs(token) {
	try {
		const part = String(token || '').split('.')[1]
		if (!part) return 0
		const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
		const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
		const json = typeof atob === 'function'
			? decodeURIComponent(
				Array.prototype.map
					.call(atob(pad), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
					.join('')
			)
			: ''
		if (!json) return 0
		const payload = JSON.parse(json)
		return payload?.exp ? Number(payload.exp) * 1000 : 0
	} catch (e) {
		return 0
	}
}

/** token 距过期仍超过 1 小时则视为新鲜，跳过微信静默换票 */
function isTokenFresh(token, minRemainMs = 60 * 60 * 1000) {
	const exp = readJwtExpMs(token)
	return exp > Date.now() + minRemainMs
}

/** 静默登录：仅在有 token 且临近过期/失效时刷新 */
export async function trySilentLoginOnLaunch() {
	const token = getToken()
	if (!token) return
	if (isTokenFresh(token)) {
		useUserStore().loadOrderCounts()
		return
	}
	try {
		const code = await getWxLoginCode()
		const data = await wxSilentLogin(code)
		useUserStore().setLoginData(data)
		useUserStore().loadOrderCounts()
	} catch (e) {
		console.warn('静默登录失败', e)
		useUserStore().logout()
	}
}

function phoneAuthFailTip(detail) {
	const msg = String(detail?.errMsg || '')
	const errno = Number(detail?.errno)
	if (msg.includes('deny') || errno === 103) return '您拒绝了授权'
	if (errno === 104 || errno === 112 || errno === 1400001) {
		return '请在微信公众平台配置用户隐私保护指引（勾选手机号）'
	}
	if (msg.includes('no permission') || msg.includes('jsapi')) {
		return '未开通手机号权限，请在公众平台开通'
	}
	return '授权失败，请用真机预览后重试'
}

/** 手机号一键登录（首次登录） */
export async function phoneNumberLogin(e) {
	if (!e.detail || e.detail.errMsg !== 'getPhoneNumber:ok') {
		if (e.detail?.errMsg) {
			uni.showToast({ title: phoneAuthFailTip(e.detail), icon: 'none', duration: 2500 })
		}
		return null
	}
	const phoneCode = e.detail.code
	if (!phoneCode) {
		uni.showToast({ title: '获取手机号失败，请使用真机或更新基础库', icon: 'none' })
		return null
	}
	try {
		const loginCode = await getWxLoginCode()
		const data = await wxPhoneLogin({ loginCode, phoneCode }, { loading: true })
		useUserStore().setLoginData(data)
		useUserStore().loadOrderCounts()
		uni.showToast({ title: '登录成功', icon: 'success' })
		return data
	} catch (err) {
		const tip = err?.message || err?.msg || '登录失败，请重试'
		uni.showToast({ title: tip.slice(0, 40), icon: 'none', duration: 2500 })
		return null
	}
}

export function logout() {
	useUserStore().logout()
}
