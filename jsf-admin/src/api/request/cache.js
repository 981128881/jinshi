import config from '@/config'

/** @type {Map<string, { data: *, expireAt: number }>} */
const cacheMap = new Map()

/**
 * @param {string} key
 */
export function getCache(key) {
  const entry = cacheMap.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expireAt) {
    cacheMap.delete(key)
    return undefined
  }
  return entry.data
}

/**
 * @param {string} key
 * @param {*} data
 * @param {number} ttl
 */
export function setCache(key, data, ttl) {
  cacheMap.set(key, {
    data,
    expireAt: Date.now() + ttl
  })
}

/**
 * @param {string} [prefix]
 */
export function clearCache(prefix) {
  if (!prefix) {
    cacheMap.clear()
    return
  }
  for (const key of cacheMap.keys()) {
    if (key.startsWith(prefix)) cacheMap.delete(key)
  }
}

/**
 * @param {boolean|number|undefined} cacheOpt
 */
export function resolveCacheTtl(cacheOpt) {
  if (!cacheOpt) return 0
  if (typeof cacheOpt === 'number') return cacheOpt
  return config.cache.defaultTtl
}
