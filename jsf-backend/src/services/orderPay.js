const prisma = require('../db/prisma')
const config = require('../config')
const { ORDER_STATUS } = require('../constants/order')
const { acquireLock, releaseLock } = require('../db/redis')
const wechatPay = require('./wechatPay')
const { publishOrderPaid } = require('./merchantNotify')
const { allocateDailyOrderNo } = require('./dailyOrderNo')
const { createLogger } = require('../utils/logger')

const log = createLogger('pay')

const LOCK_PREFIX = 'pay:notify:'

/**
 * 支付成功后的业务处理（幂等）
 * 仅以回调结果驱动状态变更
 */
async function handlePaymentSuccess({ outTradeNo, wxTransactionId, paidAmountFen }) {
  const lockKey = `${LOCK_PREFIX}${outTradeNo}`
  const locked = await acquireLock(lockKey, 30)
  if (!locked) {
    return { alreadyHandled: true }
  }

  try {
    const order = await prisma.order.findUnique({
      where: { outTradeNo },
      include: { items: true }
    })
    if (!order) {
      throw new Error(`订单不存在: ${outTradeNo}`)
    }

    if (order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.SHIPPED || order.status === ORDER_STATUS.COMPLETED) {
      return { alreadyHandled: true, orderId: order.id }
    }

    if (order.status !== ORDER_STATUS.UNPAID) {
      throw new Error(`订单状态不可支付: ${order.status}`)
    }

    if (order.totalAmountFen !== paidAmountFen) {
      throw new Error(`支付金额不一致: 期望 ${order.totalAmountFen} 分, 实付 ${paidAmountFen} 分`)
    }

    if (wxTransactionId) {
      const dup = await prisma.order.findFirst({
        where: { wxTransactionId, id: { not: order.id } }
      })
      if (dup) {
        throw new Error('微信交易号已关联其他订单')
      }
    }

    await prisma.$transaction(async (tx) => {
      const { dailyNo, businessDay } = await allocateDailyOrderNo(tx)
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.PAID,
          wxTransactionId: wxTransactionId || null,
          paidAt: new Date(),
          dailyNo,
          businessDay
        }
      })

      for (const item of order.items) {
        if (!item.productId) continue
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            sales: { increment: item.quantity }
          }
        })
      }
    })

    publishOrderPaid(order).catch((e) => {
      log.error('商家推送失败', e)
    })

    return { alreadyHandled: false, orderId: order.id }
  } finally {
    await releaseLock(lockKey)
  }
}

/** 创建预支付（或 mock 模式直接完成） */
async function createPrepay(orderId, userId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { user: true, items: true }
  })
  if (!order) {
    const err = new Error('订单不存在')
    err.statusCode = 404
    throw err
  }
  if (order.status !== ORDER_STATUS.UNPAID) {
    const err = new Error('订单状态不可支付')
    err.statusCode = 400
    throw err
  }
  if (order.expiresAt && new Date() > order.expiresAt) {
    const err = new Error('订单已超时，请重新下单')
    err.statusCode = 400
    throw err
  }

  if (config.pay.mock || !wechatPay.isPayConfigured()) {
    await handlePaymentSuccess({
      outTradeNo: order.outTradeNo,
      wxTransactionId: `MOCK_${order.outTradeNo}`,
      paidAmountFen: order.totalAmountFen
    })
    return { mockPay: true, orderId: order.id }
  }

  const openid = order.user.openid
  if (!openid) {
    const err = new Error('用户 openid 缺失')
    err.statusCode = 400
    throw err
  }

  const desc = order.items.map((i) => i.name).join('、').slice(0, 40) || '商超订单'
  const prepay = await wechatPay.createJsapiPrepay({
    outTradeNo: order.outTradeNo,
    description: desc,
    totalFen: order.totalAmountFen,
    openid
  })

  await prisma.order.update({
    where: { id: order.id },
    data: { prepayId: prepay.prepayId }
  })

  return prepay
}

/** 处理微信支付回调 */
async function handlePayNotify(rawBody, headers) {
  const data = await wechatPay.verifyAndDecryptNotify(rawBody, headers)

  if (data.trade_state !== 'SUCCESS') {
    return { code: 'SUCCESS', message: 'ignored' }
  }

  const outTradeNo = data.out_trade_no
  const wxTransactionId = data.transaction_id
  const paidAmountFen = data.amount?.total

  await handlePaymentSuccess({ outTradeNo, wxTransactionId, paidAmountFen })
  return { code: 'SUCCESS', message: '成功' }
}

/** 关闭超时未支付订单 */
async function closeExpiredOrders() {
  const now = new Date()
  const expired = await prisma.order.findMany({
    where: {
      status: ORDER_STATUS.UNPAID,
      expiresAt: { lte: now }
    },
    take: 50
  })

  let closed = 0
  for (const order of expired) {
    const lockKey = `${LOCK_PREFIX}close:${order.id}`
    const locked = await acquireLock(lockKey, 30)
    if (!locked) continue

    try {
      const fresh = await prisma.order.findUnique({ where: { id: order.id } })
      if (!fresh || fresh.status !== ORDER_STATUS.UNPAID) continue

      if (!config.pay.mock && wechatPay.isPayConfigured()) {
        try {
          await wechatPay.closeWechatOrder(order.outTradeNo)
        } catch (e) {
          log.warn(`微信关单失败 ${order.outTradeNo}`, e)
        }
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: ORDER_STATUS.CLOSED }
      })
      closed++
    } finally {
      await releaseLock(lockKey)
    }
  }

  if (closed > 0) {
    log.info(`已关闭 ${closed} 笔超时订单`, { closed })
  }
  return closed
}

function getOrderExpiresAt() {
  const minutes = config.pay.timeoutMinutes
  return new Date(Date.now() + minutes * 60 * 1000)
}

module.exports = {
  handlePaymentSuccess,
  createPrepay,
  handlePayNotify,
  closeExpiredOrders,
  getOrderExpiresAt
}
