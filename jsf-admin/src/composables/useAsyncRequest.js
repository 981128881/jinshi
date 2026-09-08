import { ref } from 'vue'
import { isCancelled } from '@/api/request'

/**
 * 列表/详情加载封装：自动管理 loading，忽略取消错误
 * @param {() => Promise<any>} loader
 */
export function useAsyncRequest(loader) {
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await loader()
      return data.value
    } catch (e) {
      if (!isCancelled(e)) error.value = e
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, data, execute }
}
