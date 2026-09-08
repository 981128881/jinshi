const crypto = require('crypto')
const prisma = require('../db/prisma')
const config = require('../config')
const { ORDER_STATUS } = require('../constants/order')
const { REFUND_STATUS, REFUND_COMPLETED_DAYS } = require('../constants/refund')
const { acquireLock, releaseLock } = require('../db/redis')
const wechatPay = require('./wechatPay')

const LOCK_PREFIX = 'refund:notify:'

function generateRefundNo() {
  return `R${Date.now()}${crypto.randomBytes(3).toString('hex')}`
}

function isWithinCompletedRefundWindow(completedAt) {
  if (!completedAt) return true
  const limitMs = REFUND_COMPLETED_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - new Date(completedAt).getTime() <= limitMs
}

/** 是否允许管理端展示/发起退款 */
function canRefundOrder(order) {
  if (!order) return false
  if (!order.paidAt && !order.wxTransactionId) return false
  if (![ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED].includes(order.status)) {
    return false
  }
  if ([REFUND_STATUS.PROCESSING, REFUND_STATUS.SUCCESS].includes(order.refundStatus)) {
    return false
  }
  if (order.status === ORDER_STATUS.COMPLETED && !isWithinCompletedRefundWindow(order.completedAt)) {
    return false
  }
  return true
}

async function handleRefundSuccess({ outRefundNo, wxRefundId }) {
  const lockKey = `${LOCK_PREFIX}${outRefundNo}`
  const locked = await acquireLock(lockKey, 30)
  if (!locked) return { alreadyHandled: true }

  try {
    const refund = await prisma.refund.findUnique({
      where: { refundNo: outRefundNo },
      include: { order: { include: { items: true } } }
    })
    if (!refund) throw new Error(`退款单不存在: ${outRefundNo}`)
    if (refund.status === REFUND_STATUS.SUCCESS) {
      return { alreadyHandled: true, orderId: refund.orderId }
    }

    const order = refund.order
    const shouldRestoreStock = order.status === ORDER_STATUS.PAID

    await prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: REFUND_STATUS.SUCCESS,
          wxRefundId: wxRefundId || refund.wxRefundId,
          successAt: new Date(),
          failReason: ''
        }
      })

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.REFUNDED,
          refundStatus: REFUND_STATUS.SUCCESS,
          refundedAt: new Date()
        }
      })

      if (shouldRestoreStock) {
        for (const item of order.items) {
          if (!item.productId) continue
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              sales: { decrement: item.quantity }
            }
          })
        }
      }
    })

    return { alreadyHandled: false, orderId: refund.orderId }
  } finally {
    await releaseLock(lockKey)
  }
}

async function markRefundFailed(refundId, message) {
  const refund = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: REFUND_STATUS.FAILED,
      failReason: String(message || '退款失败').slice(0, 500)
    },
    include: { order: true }
  })
  await prisma.order.update({
    where: { id: refund.orderId },
    data: { refundStatus: REFUND_STATUS.FAILED }
  })
  return refund
}

async function createAdminRefund(orderId, reason, operatorName = '') {
  const trimmedReason = String(reason || '').trim()
  if (!trimmedReason) {
    const err = new Error('请填写退款原因')
    err.statusCode = 400
    throw err
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  })
  if (!order) {
    const err = new Error('订单不存在')
    err.statusCode = 404
    throw err
  }
  if (!canRefundOrder(order)) {
    const err = new Error('当前订单不可退款')
    err.statusCode = 400
    throw err
  }

  const pending = await prisma.refund.findFirst({
    where: { orderId, status: REFUND_STATUS.PROCESSING }
  })
  if (pending) {
    const err = new Error('该订单已有进行中的退款')
    err.statusCode = 400
    throw err
  }

  const refundNo = generateRefundNo()
  const refund = await prisma.refund.create({
    data: {
      refundNo,
      orderId: order.id,
      userId: order.userId,
      amountFen: order.totalAmountFen,
      reason: trimmedReason.slice(0, 256),
      status: REFUND_STATUS.PROCESSING,
      operatorName: operatorName || 'admin'
    }
  })

  await prisma.order.update({
    where: { id: order.id },
    data: { refundStatus: REFUND_STATUS.PROCESSING }
  })

  try {
    if (config.pay.mock || !wechatPay.isPayConfigured()) {
      await handleRefundSuccess({
        outRefundNo: refundNo,
        wxRefundId: `MOCK_${refundNo}`
      })
      return { refundNo, mock: true }
    }

    const notifyUrl = config.pay.refundNotifyUrl || undefined
    await wechatPay.createRefund({
      outTradeNo: order.outTradeNo,
      outRefundNo: refundNo,
      reason: trimmedReason,
      totalFen: order.totalAmountFen,
      refundFen: order.totalAmountFen,
      notifyUrl
    })
    return { refundNo }
  } catch (e) {
    await markRefundFailed(refund.id, e.message)
    throw e
  }
}

async function retryAdminRefund(refundId) {
  const refund = await prisma.refund.findUnique({
    where: { id: Number(refundId) },
    include: { order: true }
  })
  if (!refund) {
    const err = new Error('退款记录不存在')
    err.statusCode = 404
    throw err
  }
  if (refund.status !== REFUND_STATUS.FAILED) {
    const err = new Error('仅失败退款可重试')
    err.statusCode = 400
    throw err
  }
  if (!canRefundOrder(refund.order)) {
    const err = new Error('当前订单不可退款')
    err.statusCode = 400
    throw err
  }

  await prisma.refund.update({
    where: { id: refund.id },
    data: { status: REFUND_STATUS.PROCESSING, failReason: '' }
  })
  await prisma.order.update({
    where: { id: refund.orderId },
    data: { refundStatus: REFUND_STATUS.PROCESSING }
  })

  try {
    if (config.pay.mock || !wechatPay.isPayConfigured()) {
      await handleRefundSuccess({
        outRefundNo: refund.refundNo,
        wxRefundId: `MOCK_${refund.refundNo}`
      })
      return { refundNo: refund.refundNo, mock: true }
    }

    await wechatPay.createRefund({
      outTradeNo: refund.order.outTradeNo,
      outRefundNo: refund.refundNo,
      reason: refund.reason,
      totalFen: refund.order.totalAmountFen,
      refundFen: refund.amountFen,
      notifyUrl: config.pay.refundNotifyUrl || undefined
    })
    return { refundNo: refund.refundNo }
  } catch (e) {
    await markRefundFailed(refund.id, e.message)
    throw e
  }
}

async function handleRefundNotify(rawBody, headers) {
  const data = await wechatPay.verifyAndDecryptNotify(rawBody, headers)

  if (data.refund_status === 'SUCCESS') {
    await handleRefundSuccess({
      outRefundNo: data.out_refund_no,
      wxRefundId: data.refund_id
    })
  } else if (data.refund_status === 'CLOSED' || data.refund_status === 'ABNORMAL') {
    const refund = await prisma.refund.findUnique({ where: { refundNo: data.out_refund_no } })
    if (refund && refund.status === REFUND_STATUS.PROCESSING) {
      await markRefundFailed(refund.id, data.refund_status)
    }
  }

  return { code: 'SUCCESS', message: '成功' }
}

module.exports = {
  canRefundOrder,
  createAdminRefund,
  retryAdminRefund,
  handleRefundSuccess,
  handleRefundNotify,
  isWithinCompletedRefundWindow
}
