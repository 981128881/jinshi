/** @type {Map<string, Set<() => void>>} */
const pageAbortMap = new Map()

/** @type {Map<string, () => void>} */
const cancelKeyMap = new Map()

/**
 * @param {string} pageId
 */
export function cancelPageRequests(pageId) {
  const set = pageAbortMap.get(pageId)
  if (!set) return
  set.forEach((abort) => {
    try {
      abort()
    } catch (e) {
      /* ignore */
    }
  })
  pageAbortMap.delete(pageId)
}

/**
 * @param {string} pageId
 * @param {() => void} abort
 */
export function registerPageAbort(pageId, abort) {
  if (!pageId) return
  if (!pageAbortMap.has(pageId)) pageAbortMap.set(pageId, new Set())
  pageAbortMap.get(pageId).add(abort)
}

/**
 * @param {string} pageId
 * @param {() => void} abort
 */
export function unregisterPageAbort(pageId, abort) {
  if (!pageId) return
  const set = pageAbortMap.get(pageId)
  if (!set) return
  set.delete(abort)
  if (set.size === 0) pageAbortMap.delete(pageId)
}

/**
 * @param {string} cancelKey
 */
export function abortByCancelKey(cancelKey) {
  if (!cancelKey || !cancelKeyMap.has(cancelKey)) return
  try {
    cancelKeyMap.get(cancelKey)()
  } catch (e) {
    /* ignore */
  }
  cancelKeyMap.delete(cancelKey)
}

/**
 * @param {string} cancelKey
 * @param {() => void} abort
 */
export function registerCancelKey(cancelKey, abort) {
  if (!cancelKey) return
  cancelKeyMap.set(cancelKey, abort)
}

/**
 * @param {string} cancelKey
 * @param {() => void} abort
 */
export function unregisterCancelKey(cancelKey, abort) {
  if (!cancelKey) return
  if (cancelKeyMap.get(cancelKey) === abort) {
    cancelKeyMap.delete(cancelKey)
  }
}
