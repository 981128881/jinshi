import { useToastStore } from '../stores/toast.js'

/**
 * 自定义 Toast（替代 uni.showToast）
 * @param {string|object} options
 */
export function showToast(options = {}) {
	const store = useToastStore()
	if (typeof options === 'string') {
		store.show({ title: options, icon: 'none' })
		return
	}
	const icon = options.icon === 'success'
		? 'success'
		: options.icon === 'error' || options.icon === 'fail'
			? 'error'
			: options.icon === 'loading'
				? 'loading'
				: 'none'
	store.show({
		title: options.title || '',
		icon,
		duration: options.duration
	})
}

export function hideToast() {
	useToastStore().hide()
}
