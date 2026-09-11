/** @param {unknown} input */
function parseDishTags(input) {
  let list = []
  if (Array.isArray(input)) list = input
  else if (typeof input === 'string' && input.trim()) {
    try {
      const parsed = JSON.parse(input)
      list = Array.isArray(parsed) ? parsed : input.split(/[,，]/)
    } catch {
      list = input.split(/[,，]/)
    }
  }
  const out = []
  for (const raw of list) {
    const s = String(raw || '').trim().slice(0, 12)
    if (s && !out.includes(s)) out.push(s)
    if (out.length >= 3) break
  }
  return out
}

/** @param {unknown} v @returns {number|null} */
function parseDishPrice(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

module.exports = { parseDishTags, parseDishPrice }

if (require.main === module) {
  const assert = require('assert')
  assert.deepEqual(parseDishTags(['本店特色', '五星推荐', '本店特色']), ['本店特色', '五星推荐'])
  assert.deepEqual(parseDishTags('招牌, 新品'), ['招牌', '新品'])
  assert.deepEqual(parseDishTags(null), [])
  assert.equal(parseDishTags(['a', 'b', 'c', 'd']).length, 3)
  assert.equal(parseDishPrice('12.3'), 12.3)
  assert.equal(parseDishPrice(-1), null)
  assert.equal(parseDishPrice('abc'), null)
  assert.equal(parseDishPrice(''), null)
  console.log('ok')
}
