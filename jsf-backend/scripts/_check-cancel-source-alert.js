/** one-shot: cancelSource filter for admin alerts */
const assert = require('assert')

function shouldAlertCancel(row) {
  return String(row?.cancelSource || '') !== 'admin'
}

assert.strictEqual(shouldAlertCancel({ cancelSource: 'admin' }), false)
assert.strictEqual(shouldAlertCancel({ cancelSource: 'user' }), true)
assert.strictEqual(shouldAlertCancel({ cancelSource: 'merchant' }), true)
assert.strictEqual(shouldAlertCancel({ cancelSource: '' }), true)
assert.strictEqual(shouldAlertCancel({}), true)
console.log('ok: shouldAlertCancel')
