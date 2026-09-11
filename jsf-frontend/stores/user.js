import { defineStore } from 'pinia'
import { setToken, removeToken } from '../utils/request.js'

const STORAGE_KEY = 'jinshifang_user'
const LEGACY_STORAGE_KEY = 'supermarket_user'

function loadUser() {
	try {
		let raw = uni.getStorageSync(STORAGE_KEY)
		if (!raw) {
			raw = uni.getStorageSync(LEGACY_STORAGE_KEY)
			if (raw) {
				uni.setStorageSync(STORAGE_KEY, raw)
				uni.removeStorageSync(LEGACY_STORAGE_KEY)
			}
		}
		return raw ? JSON.parse(raw) : null
	} catch (e) {
		return null
	}
}

function defaultUser() {
	return {
		id: null,
		nickname: '微信用户',
		avatar: '',
		phone: '',
		isLogin: false
	}
}

function emptyCounts() {
	return {
		submitted: 0,
		accepted: 0,
		ready: 0,
		completed: 0
	}
}

export const useUserStore = defineStore('user', {
	state: () => ({
		userInfo: loadUser() || defaultUser(),
		orderCounts: emptyCounts()
	}),
	getters: {
		isLogin(state) {
			return state.userInfo.isLogin
		}
	},
	actions: {
		_persist() {
			uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.userInfo))
		},
		setLoginData(data) {
			if (data.token) {
				setToken(data.token)
			}
			const info = data.userInfo || data.user || data
			this.userInfo = {
				id: info.id || null,
				nickname: info.nickname || info.nickName || '微信用户',
				avatar: info.avatar || info.avatarUrl || '',
				phone: info.phone || info.mobile || '',
				isLogin: true
			}
			this._persist()
		},
		updatePhone(phone) {
			this.userInfo.phone = phone
			this._persist()
		},
		patchProfile(info = {}) {
			if (!info || typeof info !== 'object') return
			this.userInfo = {
				...this.userInfo,
				nickname: info.nickname || this.userInfo.nickname,
				avatar: info.avatar || info.avatarUrl || this.userInfo.avatar,
				phone: info.phone || info.mobile || this.userInfo.phone,
				isLogin: true
			}
			if (info.id) this.userInfo.id = info.id
			this._persist()
		},
		async loadOrderCounts() {
			// 预约角标统计接口尚未接入，保持占位结构
			this.orderCounts = emptyCounts()
		},
		logout() {
			this.userInfo = defaultUser()
			removeToken()
			uni.removeStorageSync(STORAGE_KEY)
			uni.removeStorageSync(LEGACY_STORAGE_KEY)
			this.orderCounts = emptyCounts()
		}
	}
})
