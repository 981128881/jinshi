import { defineStore } from 'pinia'

let toastTimer = null

export const useToastStore = defineStore('toast', {
	state: () => ({
		visible: false,
		title: '',
		/** none | success | error | loading */
		icon: 'none'
	}),
	actions: {
		show(options = {}) {
			const title = typeof options === 'string' ? options : (options.title || '')
			const icon = typeof options === 'string' ? 'none' : (options.icon || 'none')
			const duration = typeof options === 'string' ? 2000 : (options.duration || 2000)

			if (toastTimer) {
				clearTimeout(toastTimer)
				toastTimer = null
			}
			this.title = title
			this.icon = icon === 'success' || icon === 'error' || icon === 'loading' ? icon : 'none'
			this.visible = true

			if (this.icon !== 'loading') {
				toastTimer = setTimeout(() => {
					this.hide()
				}, duration)
			}
		},
		hide() {
			this.visible = false
			if (toastTimer) {
				clearTimeout(toastTimer)
				toastTimer = null
			}
		}
	}
})
