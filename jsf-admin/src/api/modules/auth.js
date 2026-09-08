import { post } from '@/api/request'
import { useMockApi, mockDelay } from '@/api/_mock'

/** @typedef {{ accessToken: string, refreshToken: string, token: string, username: string }} LoginResult */

/**
 * @param {{ username: string, password: string }} data
 * @param {import('@/api/request/types.js').RequestOptions} [options]
 * @returns {Promise<LoginResult>}
 */
export function adminLogin(data, options = {}) {
  return useMockApi(
    () => post('/admin/login', data, { ...options, requireAuth: false, skipRefresh: true }),
    async () => {
      await mockDelay()
      if (data.username === 'admin' && data.password === 'admin123') {
        return {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          token: 'mock-access-token',
          username: data.username,
          nickname: '超级管理员',
          isSuper: true,
          permissions: ALL_PERMISSION_CODES
        }
      }
      throw new Error('用户名或密码错误')
    }
  )
}

/**
 * @param {string} refreshToken
 * @param {import('@/api/request/types.js').RequestOptions} [options]
 */
export function adminRefresh(refreshToken, options = {}) {
  return post(
    '/admin/refresh',
    { refreshToken },
    { ...options, requireAuth: false, showError: false, skipRefresh: true }
  )
}

/**
 * @param {string} [refreshToken]
 * @param {import('@/api/request/types.js').RequestOptions} [options]
 */
export function adminLogout(refreshToken, options = {}) {
  return post(
    '/admin/logout',
    { refreshToken },
    { ...options, requireAuth: false, showError: false, skipRefresh: true }
  )
}
