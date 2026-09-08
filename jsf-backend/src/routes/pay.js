const express = require('express')
const { handlePayNotify } = require('../services/orderPay')
const { handleRefundNotify } = require('../services/orderRefund')

const router = express.Router()

/**
 * 微信支付结果通知（APIv3）
 * 必须使用 raw body 验签，不走 JSON 中间件
 */
router.post('/notify', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await handlePayNotify(req.body, req.headers)
    res.status(200).json(result)
  } catch (e) {
    console.error('[pay/notify]', e.message)
    res.status(500).json({ code: 'FAIL', message: e.message })
  }
})

router.post('/refund/notify', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await handleRefundNotify(req.body, req.headers)
    res.status(200).json(result)
  } catch (e) {
    console.error('[pay/refund/notify]', e.message)
    res.status(500).json({ code: 'FAIL', message: e.message })
  }
})

module.exports = router
