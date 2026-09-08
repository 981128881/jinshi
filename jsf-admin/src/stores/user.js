import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getToken,
  getRefreshToken,
  setTokens,
  setUsername,
  getUsername,
  setNickname,
  getNickname,
  clearAuthStorage,
  isValidToken,
  getOrgType,
  setOrgType,
  getRestaurantId,
  setRestaurantId,
  getRestaurantName,
  setRestaurantName
} from '@/api/request/token'
import { usePermissionStore } from '@/stores/permission'
import { setupDynamicRoutes, resolveHomePath } from '@/router/dynamic'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const username = ref(getUsername())
  const nickname = ref(getNickname())
  const orgType = ref(getOrgType())
  const restaurantId = ref(getRestaurantId())
  const restaurantName = ref(getRestaurantName())
  const permissionStore = usePermissionStore()

  const isLogin = computed(() => isValidToken(getToken()) && !!getRefreshToken())
  const displayName = computed(() => nickname.value || username.value || '管理员')
  const isOrgAdmin = computed(() => orgType.value === 'restaurant' && !!restaurantId.value)

  function applyAuthPayload(data, fallbackUsername = '') {
    const accessToken = data?.accessToken || data?.token
    const refreshToken = data?.refreshToken
    if (!accessToken || !refreshToken) {
      throw new Error('登录失败：未返回完整 token')
    }

    setTokens({ accessToken, refreshToken })
    setUsername(data.username || fallbackUsername)
    setNickname(data.nickname || data.username || fallbackUsername)
    setOrgType(data.orgType || 'platform')
    setRestaurantId(data.restaurantId ?? null)
    setRestaurantName(data.restaurantName || '')
    token.value = accessToken
    username.value = data.username || fallbackUsername
    nickname.value = data.nickname || data.username || fallbackUsername
    orgType.value = data.orgType || 'platform'
    restaurantId.value = data.restaurantId ?? null
    restaurantName.value = data.restaurantName || ''
    permissionStore.setAuth({
      permissions: data.permissions || [],
      isSuper: data.isSuper
    })
    setupDynamicRoutes((code) => permissionStore.has(code))
  }

  function syncFromStorage() {
    const storedToken = getToken()

    if (token.value && isValidToken(token.value) && !storedToken) {
      setTokens({ accessToken: token.value, refreshToken: getRefreshToken() })
      return
    }

    if (!isValidToken(storedToken) || !getRefreshToken()) {
      if (storedToken || token.value || getRefreshToken()) logout()
      return
    }

    token.value = storedToken
    username.value = getUsername()
    nickname.value = getNickname()
    orgType.value = getOrgType()
    restaurantId.value = getRestaurantId()
    restaurantName.value = getRestaurantName()
    permissionStore.syncFromStorage()
  }

  async function login(form) {
    const { adminLogin } = await import('@/api/modules/auth')
    const data = await adminLogin(form, { loading: true, requireAuth: false, showError: true })
    applyAuthPayload(data, form.username)
  }

  async function fetchProfile() {
    const { fetchAdminProfile } = await import('@/api/modules/adminAccount')
    const data = await fetchAdminProfile()
    permissionStore.setAuth({
      permissions: data.permissions || [],
      isSuper: data.isSuper
    })
    setupDynamicRoutes((code) => permissionStore.has(code))
    if (data.nickname) {
      nickname.value = data.nickname
      setNickname(data.nickname)
    }
    if (data.orgType) {
      orgType.value = data.orgType
      setOrgType(data.orgType)
    }
    if (data.restaurantId != null) {
      restaurantId.value = data.restaurantId
      setRestaurantId(data.restaurantId)
    }
    if (data.restaurantName != null) {
      restaurantName.value = data.restaurantName
      setRestaurantName(data.restaurantName)
    }
    return data
  }

  async function logout() {
    const refreshToken = getRefreshToken()
    token.value = ''
    username.value = ''
    nickname.value = ''
    orgType.value = 'platform'
    restaurantId.value = null
    restaurantName.value = ''
    clearAuthStorage()
    permissionStore.clearAuth()

    if (refreshToken && !refreshToken.startsWith('mock-')) {
      try {
        const { adminLogout } = await import('@/api/modules/auth')
        await adminLogout(refreshToken, { showError: false })
      } catch {
        /* ignore */
      }
    }

    const { default: router } = await import('@/router/index')
    router.replace({ name: 'Login' })
  }

  function getHomePath() {
    return resolveHomePath((code) => permissionStore.has(code))
  }

  /** 门店账号跳转自己的餐厅详情 */
  function getMyRestaurantPath() {
    if (isOrgAdmin.value && restaurantId.value) {
      return `/restaurants/${restaurantId.value}`
    }
    return '/restaurants'
  }

  return {
    token,
    username,
    nickname,
    orgType,
    restaurantId,
    restaurantName,
    displayName,
    isLogin,
    isOrgAdmin,
    syncFromStorage,
    login,
    fetchProfile,
    logout,
    getHomePath,
    getMyRestaurantPath
  }
})
