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
