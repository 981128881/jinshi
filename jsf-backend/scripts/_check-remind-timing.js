/** one-shot: remind timing + force overwrite when dialog open */
const assert = require('assert')

const REMIND_MS = 5 * 60_000

function shouldRemind(lastAlertAt, now = Date.now()) {
  return lastAlertAt > 0 && now - lastAlertAt >= REMIND_MS
}

const t0 = 1_000_000
assert.strictEqual(shouldRemind(0, t0), false)
assert.strictEqual(shouldRemind(t0, t0 + REMIND_MS - 1), false)
assert.strictEqual(shouldRemind(t0, t0 + REMIND_MS), true)
assert.strictEqual(shouldRemind(t0, t0 + REMIND_MS + 45_000), true)
console.log('ok: shouldRemind')
