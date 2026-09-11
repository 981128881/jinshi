/** 登录失败限流：同一 IP+账号 5 次 / 15 分钟 */
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 5

/** @type {Map<string, { n: number, until: number }>} */
const fails = new Map()

function keyOf(ip, username) {
  return `${ip || '?'}|${String(username || '').trim().toLowerCase()}`
}

function isBlocked(ip, username) {
  const row = fails.get(keyOf(ip, username))
  if (!row) return false
  if (row.until <= Date.now()) {
    fails.delete(keyOf(ip, username))
    return false
  }
  return row.n >= MAX_FAILS
}

function recordFail(ip, username) {
  const k = keyOf(ip, username)
  const now = Date.now()
  const row = fails.get(k)
  if (!row || row.until <= now) {
    fails.set(k, { n: 1, until: now + WINDOW_MS })
    return
  }
  row.n += 1
}

function recordOk(ip, username) {
  fails.delete(keyOf(ip, username))
}

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return xf || req.ip || req.socket?.remoteAddress || ''
}

module.exports = { isBlocked, recordFail, recordOk, clientIp, MAX_FAILS, WINDOW_MS }

if (require.main === module) {
  const assert = require('assert')
  assert.equal(isBlocked('1.1.1.1', 'a'), false)
  for (let i = 0; i < MAX_FAILS; i++) recordFail('1.1.1.1', 'a')
  assert.equal(isBlocked('1.1.1.1', 'a'), true)
  assert.equal(isBlocked('1.1.1.1', 'b'), false)
  recordOk('1.1.1.1', 'a')
  assert.equal(isBlocked('1.1.1.1', 'a'), false)
  console.log('ok')
}
