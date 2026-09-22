import config from '../config/index.js'

/** 必须在用户点击回调里调用，不能放在 onShow / await 之后 */
export function askReservationSubscribe(done) {
	const ids = [config.subscribeOrderTmplId, config.subscribeCancelTmplId].filter(Boolean)
	const next = typeof done === 'function' ? done : () => {}
	if (!ids.length || typeof uni.requestSubscribeMessage !== 'function') {
		next()
		return
	}
	uni.requestSubscribeMessage({
		tmplIds: ids,
		complete: next
	})
}

/** @deprecated 使用 askReservationSubscribe */
export function askOrderSubscribe(done) {
	askReservationSubscribe(done)
}
