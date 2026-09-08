import { reactive } from 'vue'
import { isCancelled } from '@/api/request'

/**
 * 防重复提交：同一 action key 进行中时忽略后续点击
 */
export function useActionLock() {
  /** @type {Record<string, boolean>} */
  const actionLoading = reactive({})

  /**
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} fn
   * @returns {Promise<T|undefined>}
   */
  async function runAction(key, fn) {
    if (actionLoading[key]) return undefined
    actionLoading[key] = true
    try {
      return await fn()
    } catch (e) {
      if (!isCancelled(e)) throw e
      return undefined
    } finally {
      actionLoading[key] = false
    }
  }

  return { actionLoading, runAction }
}
