/** @type {Map<string, { abort: () => void, promise: Promise<any> }>} */
const pendingMap = new Map()

/**
 * @param {string} method
 * @param {string} url
 * @param {*} [params]
 * @param {*} [data]
 */
export function buildRequestKey(method, url, params, data) {
  return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`
}

/**
 * @param {string} key
 */
export function getPendingRequest(key) {
  return pendingMap.get(key)
}

/**
 * @param {string} key
 * @param {{ abort: () => void, promise: Promise<any> }} entry
 */
export function setPendingRequest(key, entry) {
  pendingMap.set(key, entry)
}

/**
 * @param {string} key
 * @param {() => void} abort
 */
export function clearPendingRequest(key, abort) {
  const entry = pendingMap.get(key)
  if (entry && entry.abort === abort) {
    pendingMap.delete(key)
  }
}

export function clearAllPendingRequests() {
  pendingMap.forEach((entry) => {
    try {
      entry.abort()
    } catch (e) {
      /* ignore */
    }
  })
  pendingMap.clear()
}
