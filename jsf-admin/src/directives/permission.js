import { usePermissionStore } from '@/stores/permission'

/**
 * @param {import('vue').App} app
 */
export function setupPermissionDirective(app) {
  app.directive('permission', {
    mounted(el, binding) {
      const store = usePermissionStore()
      const value = binding.value
      const codes = Array.isArray(value) ? value : value ? [value] : []
      if (!codes.length) return
      if (!store.has(codes)) {
        el.parentNode?.removeChild(el)
      }
    }
  })
}
