import config from '@/config'

/** @type {Set<(token: string) => void>} */
const listeners = new Set()

/** @type {string | null} */
let memoryToken = null
/** @type {string | null} */
let memoryRefreshToken = null

function readStorageToken() {
  try {
    return localStorage.getItem(config.tokenKey) || ''
  } catch {
    return ''
  }
}

function readStorageRefreshToken() {
  try {
    return localStorage.getItem(config.refreshTokenKey) || ''
  } catch {
    return ''
  }
}

function writeStorageToken(token) {
  try {
    if (token) localStorage.setItem(config.tokenKey, token)
    else localStorage.removeItem(config.tokenKey)
  } catch {
    /* ignore */
  }
}

function writeStorageRefreshToken(token) {
  try {
    if (token) localStorage.setItem(config.refreshTokenKey, token)
    else localStorage.removeItem(config.refreshTokenKey)
  } catch {
    /* ignore */
  }
}

function notifyTokenChange(token) {
  listeners.forEach((fn) => {
    try {
      fn(token)
    } catch {
      /* ignore */
    }
  })
}

/** @param {(token: string) => void} fn */
export function onTokenChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getToken() {
  if (memoryToken) return memoryToken
  const stored = readStorageToken()
  if (stored) memoryToken = stored
  return stored
}

export function getRefreshToken() {
  if (memoryRefreshToken) return memoryRefreshToken
  const stored = readStorageRefreshToken()
  if (stored) memoryRefreshToken = stored
  return stored
}

/** @param {string} [token] */
export function isValidToken(token = getToken()) {
  if (!token || token.startsWith('mock-')) return false
  return token.split('.').length === 3
}

/** @param {string} token */
export function setToken(token) {
  memoryToken = token || ''
  writeStorageToken(token)
  notifyTokenChange(memoryToken)
}

/** @param {string} token */
export function setRefreshToken(token) {
  memoryRefreshToken = token || ''
  writeStorageRefreshToken(token)
}

/**
 * @param {{ accessToken?: string, token?: string, refreshToken?: string }} tokens
 */
export function setTokens(tokens) {
  const accessToken = tokens.accessToken || tokens.token || ''
  setToken(accessToken)
  setRefreshToken(tokens.refreshToken || '')
}

export function removeToken() {
  memoryToken = ''
  writeStorageToken('')
  notifyTokenChange('')
}

export function removeRefreshToken() {
  memoryRefreshToken = ''
  writeStorageRefreshToken('')
}

export function getUsername() {
  try {
    return localStorage.getItem(config.userKey) || ''
  } catch {
    return ''
  }
}

/** @param {string} username */
export function setUsername(username) {
  try {
    if (username) localStorage.setItem(config.userKey, username)
    else localStorage.removeItem(config.userKey)
  } catch {
    /* ignore */
  }
}

export function removeUsername() {
  try {
    localStorage.removeItem(config.userKey)
  } catch {
    /* ignore */
  }
}

export function clearAuthStorage() {
  removeToken()
  removeRefreshToken()
  removeUsername()
  clearPermissionStorage()
}

export function getPermissions() {
  try {
    const raw = localStorage.getItem(config.permissionsKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {string[]} list */
export function setPermissions(list) {
  try {
    localStorage.setItem(config.permissionsKey, JSON.stringify(list || []))
  } catch {
    /* ignore */
  }
}

export function getIsSuper() {
  try {
    return localStorage.getItem(config.isSuperKey) === '1'
  } catch {
    return false
  }
}

/** @param {boolean} value */
export function setIsSuper(value) {
  try {
    localStorage.setItem(config.isSuperKey, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function getNickname() {
  try {
    return localStorage.getItem(config.nicknameKey) || ''
  } catch {
    return ''
  }
}

/** @param {string} nickname */
export function setNickname(nickname) {
  try {
    if (nickname) localStorage.setItem(config.nicknameKey, nickname)
    else localStorage.removeItem(config.nicknameKey)
  } catch {
    /* ignore */
  }
}

export function getOrgType() {
  try {
    return localStorage.getItem(config.orgTypeKey) || 'platform'
  } catch {
    return 'platform'
  }
}

/** @param {string} orgType */
export function setOrgType(orgType) {
  try {
    if (orgType) localStorage.setItem(config.orgTypeKey, orgType)
    else localStorage.removeItem(config.orgTypeKey)
  } catch {
    /* ignore */
  }
}

export function getRestaurantId() {
  try {
    const v = localStorage.getItem(config.restaurantIdKey)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

/** @param {number|string|null} id */
export function setRestaurantId(id) {
  try {
    if (id != null && id !== '') localStorage.setItem(config.restaurantIdKey, String(id))
    else localStorage.removeItem(config.restaurantIdKey)
  } catch {
    /* ignore */
  }
}

export function getRestaurantName() {
  try {
    return localStorage.getItem(config.restaurantNameKey) || ''
  } catch {
    return ''
  }
}

/** @param {string} name */
export function setRestaurantName(name) {
  try {
    if (name) localStorage.setItem(config.restaurantNameKey, name)
    else localStorage.removeItem(config.restaurantNameKey)
  } catch {
    /* ignore */
  }
}

export function clearPermissionStorage() {
  try {
    localStorage.removeItem(config.permissionsKey)
    localStorage.removeItem(config.isSuperKey)
    localStorage.removeItem(config.nicknameKey)
    localStorage.removeItem(config.orgTypeKey)
    localStorage.removeItem(config.restaurantIdKey)
    localStorage.removeItem(config.restaurantNameKey)
  } catch {
    /* ignore */
  }
}

memoryToken = readStorageToken()
memoryRefreshToken = readStorageRefreshToken()
