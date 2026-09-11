import { post } from '../utils/request.js'

export function wxSilentLogin(code, options = {}) {
	return post('/auth/wx-login', { code }, { auth: false, showError: false, ...options })
}

/** 手机号一键登录（首次） */
export function wxPhoneLogin(data, options = {}) {
	return post('/auth/phone-login', data, { auth: false, loading: true, ...options })
}

/** 开发环境模拟登录 */
export function devLogin(options = {}) {
	return post('/auth/dev-login', {}, { auth: false, loading: true, ...options })
}
