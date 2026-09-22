/** 东八区「今天」的分钟数 0..1439 */
function minutesNowShanghai(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  return hour * 60 + minute
}

/** @param {unknown} s @returns {number|null} 分钟，非法返回 null */
function parseHm(s) {
  const m = String(s || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/** 规范化为 HH:mm；空串允许；非法返回 null */
function normalizeHm(s) {
  if (s == null || String(s).trim() === '') return ''
  const mins = parseHm(s)
  if (mins == null) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * 是否在营业时段内。两端都空 = 不限时段。
 * 支持跨零点：22:00–02:00
 */
function isWithinBusinessHours(openTime, closeTime, now = new Date()) {
  const start = parseHm(openTime)
  const end = parseHm(closeTime)
  if (start == null && end == null) return true
  if (start == null || end == null) return true // 只填一端也视为不限
  if (start === end) return true // 全天
  const cur = minutesNowShanghai(now)
  if (start < end) return cur >= start && cur < end
  // 跨零点
  return cur >= start || cur < end
}

/** 手动开 + 在时段内 */
function isEffectivelyOpen(restaurant, now = new Date()) {
  if (!restaurant || !restaurant.open) return false
  return isWithinBusinessHours(restaurant.openTime, restaurant.closeTime, now)
}

module.exports = {
  minutesNowShanghai,
  parseHm,
  normalizeHm,
  isWithinBusinessHours,
  isEffectivelyOpen
}

if (require.main === module) {
  const assert = require('assert')
  assert.equal(normalizeHm('9:30'), '09:30')
  assert.equal(normalizeHm(''), '')
  assert.equal(normalizeHm('25:00'), null)
  // 10:00-22:00
  assert.equal(isWithinBusinessHours('10:00', '22:00', new Date('2026-09-22T04:00:00Z')), true) // 12:00 CST
  assert.equal(isWithinBusinessHours('10:00', '22:00', new Date('2026-09-22T00:00:00Z')), false) // 08:00 CST
  // 22:00-02:00 cross midnight
  assert.equal(isWithinBusinessHours('22:00', '02:00', new Date('2026-09-22T15:30:00Z')), true) // 23:30 CST
  assert.equal(isWithinBusinessHours('22:00', '02:00', new Date('2026-09-22T06:00:00Z')), false) // 14:00 CST
  assert.equal(isEffectivelyOpen({ open: true, openTime: '', closeTime: '' }), true)
  assert.equal(isEffectivelyOpen({ open: false, openTime: '00:00', closeTime: '23:59' }), false)
  console.log('ok')
}
