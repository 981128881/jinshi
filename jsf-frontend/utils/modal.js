import { useModalStore } from '../stores/modal.js'

/** 自定义弹窗（替代 uni.showModal） */
export function showModal(options = {}) {
	return useModalStore().open(options)
}

/** 双按钮确认 */
export function showConfirm(content, title = '提示', options = {}) {
	return showModal({
		title,
		content,
		showCancel: true,
		...options
	})
}

/** 单按钮提示 */
export function showAlert(content, title = '提示', options = {}) {
	return showModal({
		title,
		content,
		showCancel: false,
		confirmText: options.confirmText || '知道了',
		...options
	})
}
