import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getPermissions,
  getIsSuper,
  setPermissions,
  setIsSuper,
  clearPermissionStorage
} from '@/api/request/token'

export const usePermissionStore = defineStore('permission', () => {
  const permissions = ref(getPermissions())
  const isSuper = ref(getIsSuper())

  function setAuth(payload = {}) {
    const list = Array.isArray(payload.permissions) ? payload.permissions : []
    const superFlag = !!payload.isSuper
    permissions.value = list
    isSuper.value = superFlag
    setPermissions(list)
    setIsSuper(superFlag)
  }

  function clearAuth() {
    permissions.value = []
    isSuper.value = false
    clearPermissionStorage()
  }

  function syncFromStorage() {
    permissions.value = getPermissions()
    isSuper.value = getIsSuper()
  }

  /** @param {string | string[]} code */
  function has(code) {
    if (isSuper.value) return true
    const codes = Array.isArray(code) ? code : [code]
    return codes.some((c) => permissions.value.includes(c))
  }

  /** @param {{ permission?: string, children?: any[] }} item */
  function canAccessMenu(item) {
    if (isSuper.value) return true
    if (item.permission && permissions.value.includes(item.permission)) return true
    if (item.children?.length) {
      return item.children.some((child) => canAccessMenu(child))
    }
    return false
  }

  return { permissions, isSuper, setAuth, clearAuth, syncFromStorage, has, canAccessMenu }
})
