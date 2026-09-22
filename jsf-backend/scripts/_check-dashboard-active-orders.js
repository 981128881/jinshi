/** one-shot: cancelled orders excluded from dashboard stats where */
const assert = require('assert')

const CANCELLED = 'cancelled'

function activeOrderWhere(scope = {}) {
  return { ...scope, status: { not: CANCELLED } }
}

assert.deepStrictEqual(activeOrderWhere(), { status: { not: 'cancelled' } })
assert.deepStrictEqual(activeOrderWhere({ restaurantId: 1 }), {
  restaurantId: 1,
  status: { not: 'cancelled' }
})
console.log('ok: activeOrderWhere')
