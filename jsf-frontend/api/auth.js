import { post } from '../utils/request.js'

export function wxSilentLogin(code, options = {}) {
	return post('/auth/wx-login', { code }, { auth: false, showError: false, ...options })
}

/** 手机号一键登录（首次） */
export function wxPhoneLogin(data, options = {}) {
	return post('/auth/phone-login', data, { auth: false, loading: true, ...options })
}
