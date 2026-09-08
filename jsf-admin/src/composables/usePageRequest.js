import { onUnmounted } from 'vue'
import { cancelPageRequests } from '@/api/request'

let pageSeq = 0

/**
 * 页面级请求生命周期：卸载时自动取消该页所有 in-flight 请求
 * @returns {{ pageId: string, requestOptions: (extra?: import('@/api/request/types.js').RequestOptions) => import('@/api/request/types.js').RequestOptions }}
 */
export function usePageRequest() {
  const pageId = `page-${++pageSeq}-${Date.now()}`

  onUnmounted(() => {
    cancelPageRequests(pageId)
  })

  /** @param {import('@/api/request/types.js').RequestOptions} [extra] */
  function requestOptions(extra = {}) {
    return { pageId, ...extra }
  }

  return { pageId, requestOptions }
}
