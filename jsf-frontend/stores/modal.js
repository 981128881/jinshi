import { defineStore } from 'pinia'

export const useModalStore = defineStore('modal', {
	state: () => ({
		visible: false,
		title: '',
		content: '',
		confirmText: '确定',
		cancelText: '取消',
		showCancel: true,
		/** default | danger | success */
		type: 'default',
		_resolve: null
	}),
	actions: {
		open(options = {}) {
			return new Promise((resolve) => {
				// 若已有弹窗未关闭，先结束旧 Promise，避免悬挂
				if (this._resolve) {
					this._resolve({ confirm: false, cancel: true })
					this._resolve = null
				}
				this._resolve = resolve
				this.title = options.title != null ? options.title : '提示'
				this.content = options.content || ''
				this.confirmText = options.confirmText || '确定'
				this.cancelText = options.cancelText || '取消'
				this.showCancel = options.showCancel !== false
				this.type = options.type || 'default'
				this.visible = true
			})
		},
		confirm() {
			this.visible = false
			if (this._resolve) this._resolve({ confirm: true, cancel: false })
			this._resolve = null
		},
		cancel() {
			this.visible = false
			if (this._resolve) this._resolve({ confirm: false, cancel: true })
			this._resolve = null
		}
	}
})
