/** 预约单状态展示与筛选（submitted|accepted|ready|completed|cancelled） */

const STATUS_LABEL = {
  submitted: '待接单',
  accepted: '备餐中',
  ready: '备餐中',
  completed: '已完成',
  cancelled: '已取消'
}

/** 备餐中 = accepted + ready */
const PREPARING_STATUSES = ['accepted', 'ready']

/**
 * 列表筛选：preparing → { in: [...] }；其它原样；空/all → undefined
 * @param {string} [status]
 * @returns {string|{in: string[]}|undefined}
 */
function resolveOrderStatusFilter(status) {
  const s = String(status || '').trim()
  if (!s || s === 'all' || s === '0') return undefined
  if (s === 'preparing') return { in: PREPARING_STATUSES }
  return s
}

function reservationStatusLabel(status) {
  return STATUS_LABEL[status] || status || ''
}

module.exports = {
  STATUS_LABEL,
  PREPARING_STATUSES,
  resolveOrderStatusFilter,
  reservationStatusLabel
}

if (require.main === module) {
  const assert = require('assert')
  assert.deepStrictEqual(resolveOrderStatusFilter('preparing'), { in: ['accepted', 'ready'] })
  assert.strictEqual(resolveOrderStatusFilter('submitted'), 'submitted')
  assert.strictEqual(resolveOrderStatusFilter(''), undefined)
  assert.strictEqual(reservationStatusLabel('ready'), '备餐中')
  assert.strictEqual(reservationStatusLabel('accepted'), '备餐中')
  console.log('ok: reservationStatus')
}
