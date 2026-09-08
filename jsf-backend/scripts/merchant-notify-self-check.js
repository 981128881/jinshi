/** @param {object} order */
function assertOrderPaidPayload(order) {
  if (!order || order.type !== 'order.paid' || !order.orderId) {
    throw new Error('invalid order.paid payload')
  }
}

assertOrderPaidPayload({
  type: 'order.paid',
  orderId: '123',
  totalAmount: 1,
  createTime: '2026-01-01 00:00:00'
})

try {
  assertOrderPaidPayload({ type: 'connected' })
  throw new Error('should have failed')
} catch (e) {
  if (!String(e.message).includes('invalid')) throw e
}

console.log('merchantNotify payload self-check passed')
