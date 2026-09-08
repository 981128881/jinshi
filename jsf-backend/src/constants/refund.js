/** 订单退款状态（与支付主状态分离） */
const REFUND_STATUS = {
  NONE: 0,
  PROCESSING: 2,
  SUCCESS: 3,
  FAILED: 5
}

/** 已完成订单可退款天数 */
const REFUND_COMPLETED_DAYS = 3

module.exports = { REFUND_STATUS, REFUND_COMPLETED_DAYS }
