/** 预约单状态：后端码 → 展示文案（accepted/ready 均展示为备餐中） */
export const RESERVATION_STATUS = {
	submitted: '待接单',
	accepted: '备餐中',
	ready: '备餐中',
	completed: '已完成',
	cancelled: '已取消'
}

/** 我的预约 / 列表 Tab */
export const RESERVATION_TABS = [
	{ status: 'submitted', label: '待接单' },
	{ status: 'preparing', label: '备餐中' },
	{ status: 'completed', label: '已完成' },
	{ status: 'cancelled', label: '已取消' }
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

/** 展示用当日序号；避免模板写 #{{x}}（微信 WXML 会解析失败导致白屏） */
export function formatDailyNo(n) {
	const v = Number(n)
	if (!v) return '—'
	return `#${v}`
}
