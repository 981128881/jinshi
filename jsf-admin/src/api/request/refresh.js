import { post } from './client.js'
import {
  getRefreshToken,
  setTokens,
  setPermissions,
  setIsSuper,
  setNickname,
  setOrgType,
  setRestaurantId,
  setRestaurantName
} from './token.js'

/** @type {Promise<string> | null} */
let refreshPromise = null

/**
 * 使用 refreshToken 换取新的 accessToken（并发请求共享同一刷新 Promise）
 * @returns {Promise<string>}
 */
export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      throw new Error('no refresh token')
    }

    const data = await post(
      '/admin/refresh',
      { refreshToken },
      {
        requireAuth: false,
        showError: false,
        skipRefresh: true
      }
    )

    const accessToken = data?.accessToken || data?.token
    const newRefreshToken = data?.refreshToken
    if (!accessToken || !newRefreshToken) {
      throw new Error('invalid refresh response')
    }

    setTokens({ accessToken, refreshToken: newRefreshToken })
    if (data?.permissions) setPermissions(data.permissions)
    if (data?.isSuper != null) setIsSuper(!!data.isSuper)
    if (data?.nickname) setNickname(data.nickname)
    if (data?.orgType) setOrgType(data.orgType)
    if (data?.restaurantId != null) setRestaurantId(data.restaurantId)
    if (data?.restaurantName != null) setRestaurantName(data.restaurantName)
    return accessToken
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}
