function pageTake(pageSize, fallback = 10, max = 100) {
  const n = Number(pageSize)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.trunc(n), max)
}

function pageSkip(page, take) {
  const n = Number(page)
  const p = Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1
  return (p - 1) * take
}

module.exports = { pageTake, pageSkip }

if (require.main === module) {
  const assert = require('assert')
  assert.equal(pageTake(999999), 100)
  assert.equal(pageTake(-1), 10)
  assert.equal(pageTake('abc'), 10)
  assert.equal(pageSkip(0, 10), 0)
  assert.equal(pageSkip(2, 10), 10)
  console.log('ok')
}
