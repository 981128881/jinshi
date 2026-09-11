import { ref, computed, unref } from 'vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'

export function useClientPager(source) {
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const total = computed(() => (unref(source) || []).length)
  const paged = computed(() => {
    const rows = unref(source) || []
    const start = (page.value - 1) * pageSize.value
    return rows.slice(start, start + pageSize.value)
  })
  return { page, pageSize, total, paged }
}
