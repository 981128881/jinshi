export function restaurantIdFromQuery(query = {}) {
	const raw = query.id || query.scene
	if (raw == null || raw === '') return 0
	let s = String(raw)
	try {
		s = decodeURIComponent(s)
	} catch (e) {}
	const n = Number(/^id=/i.test(s) ? s.slice(3) : s)
	return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0
}

/** 分享/扫码冷启动带的店铺 id，整个会话有效 */
export function launchedRestaurantId() {
	try {
		const q = typeof uni !== 'undefined' && uni.getLaunchOptionsSync
			? (uni.getLaunchOptionsSync().query || {})
			: {}
		return restaurantIdFromQuery(q)
	} catch (e) {
		return 0
	}
}
