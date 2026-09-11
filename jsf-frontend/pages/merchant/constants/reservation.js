/** 预约单状态：后端码 → 展示文案 */
export const RESERVATION_STATUS = {
	submitted: '待接单',
	accepted: '制作中',
	ready: '待取餐',
	completed: '已完成',
	cancelled: '已取消'
}

/** 我的预约 Tab（不含已取消） */
export const RESERVATION_TABS = [
	{ status: '', label: '全部' },
	{ status: 'submitted', label: '待接单' },
	{ status: 'accepted', label: '制作中' },
	{ status: 'ready', label: '待取餐' },
	{ status: 'completed', label: '已完成' }
]

export function reservationStatusText(status) {
	return RESERVATION_STATUS[status] || status || ''
}

export function formatReserveTime(t) {
	if (!t) return ''
	const d = new Date(t)
	if (Number.isNaN(d.getTime())) return ''
	const pad = (n) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function reservationItemSummary(order) {
	const items = order?.items
	if (!Array.isArray(items) || !items.length) return '暂无菜品'
	return items.map((i) => `${i.name || '菜品'}x${i.quantity || 1}`).join('、')
}
