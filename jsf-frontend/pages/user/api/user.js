import { get, put, getToken } from '../../../utils/request.js'
import config from '../../../config/index.js'

export function fetchUserInfo(options = {}) {
	return get('/user/info', {}, { auth: true, ...options })
}

export function updateUserProfile(data, options = {}) {
	return put('/user/profile', data, { auth: true, loading: true, ...options })
}

/** 上传头像，返回更新后的用户信息 */
export function uploadUserAvatar(filePath, options = {}) {
	return new Promise((resolve, reject) => {
		const token = getToken()
		uni.uploadFile({
			url: `${config.baseUrl.replace(/\/$/, '')}/user/avatar`,
			filePath,
			name: 'file',
			formData: { type: 'avatar' },
			header: token ? { Authorization: `Bearer ${token}` } : {},
			success(res) {
				try {
					const body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
					if (body && (body.code === 0 || body.code === 200)) {
						resolve(body.data)
						return
					}
					reject(body || { message: '上传失败' })
				} catch (e) {
					reject({ message: '上传响应解析失败' })
				}
			},
			fail: reject,
			...options
		})
	})
}
