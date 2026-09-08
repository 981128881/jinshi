const express = require('express')
const prisma = require('../db/prisma')
const { formatOrder, generateOrderId, yuanToFen } = require('../db/formatters')
const { getShopConfig } = require('../services/shop')
const { createPrepay, getOrderExpiresAt } = require('../services/orderPay')
const { ORDER_STATUS } = require('../constants/order')
const { success, fail } = require('../utils/response')
const { authRequired } = require('../middleware/auth')
const { distanceKm } = require('../utils/distance')

const router = express.Router()
router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const status = Number(req.query.status) || 0
    const where = { userId: req.userId }
    if (status !== 0) {
      if (status === ORDER_STATUS.COMPLETED) {
        where.status = { in: [ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED] }
      } else {
        where.status = status
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    })
    const addressIds = [...new Set(orders.map((o) => o.addressId).filter(Boolean))]
    const addresses = addressIds.length
      ? await prisma.address.findMany({ where: { id: { in: addressIds }, userId: req.userId } })
      : []
    const addressMap = new Map(addresses.map((a) => [a.id, a]))
    return success(res, orders.map((o) => formatOrder(o, o.items, addressMap.get(o.addressId))))
  } catch (e) {
    next(e)
  }
})

router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.userId },
      include: { items: true }
    })
    if (!order) return fail(res, 404, '订单不存在', 404)

    let address = null
    if (order.addressId) {
      address = await prisma.address.findFirst({
        where: { id: order.addressId, userId: req.userId }
      })
    }
    return success(res, formatOrder(order, order.items, address))
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { addressId, items, latitude, longitude, remark } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) {
      return fail(res, 400, '请选择商品')
    }

    if (!addressId) {
      return fail(res, 400, '请选择收货地址')
    }

    const address = await prisma.address.findFirst({
      where: { id: Number(addressId), userId: req.userId }
    })
    if (!address) return fail(res, 400, '收货地址无效')

    const shop = await getShopConfig()
    if (latitude != null && longitude != null && shop) {
      const dist = distanceKm(latitude, longitude, shop.latitude, shop.longitude)
      if (dist > shop.deliveryRadiusKm) {
        return fail(res, 400, `超出配送范围（${shop.deliveryRadiusKm}公里）`)
      }
    }

    let totalAmountFen = 0
    const orderItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: Number(item.productId || item.id) }
      })
      if (!product) return fail(res, 400, `商品不存在: ${item.productId || item.id}`)
      const qty = Number(item.quantity) || 1
      if (qty < 1) return fail(res, 400, '商品数量无效')
      if (product.stock < qty) return fail(res, 400, `库存不足: ${product.name}`)

      const lineFen = yuanToFen(product.price) * qty
      totalAmountFen += lineFen
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image
      })
    }

    const orderId = generateOrderId()
    const totalAmount = totalAmountFen / 100

    await prisma.order.create({
      data: {
        id: orderId,
        outTradeNo: orderId,
        userId: req.userId,
        status: ORDER_STATUS.UNPAID,
        totalAmount,
        totalAmountFen,
        addressId: address.id,
        remark: String(remark || '').trim().slice(0, 256),
        expiresAt: getOrderExpiresAt(),
        items: { create: orderItems }
      }
    })

    return success(res, { orderId, success: true })
  } catch (e) {
    next(e)
  }
})

/** 统一下单，返回小程序调起支付参数（mock 模式直接完成支付） */
router.post('/:orderId/prepay', async (req, res, next) => {
  try {
    const prepay = await createPrepay(req.params.orderId, req.userId)
    return success(res, prepay)
  } catch (e) {
    next(e)
  }
})

router.post('/:orderId/confirm', async (req, res, next) => {
  try {
    const orderId = req.params.orderId
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.userId }
    })
    if (!order) return fail(res, 404, '订单不存在', 404)
    if (order.status !== ORDER_STATUS.SHIPPED) return fail(res, 400, '订单状态不可确认收货')

    await prisma.order.update({
      where: { id: orderId },
      data: { status: ORDER_STATUS.COMPLETED, completedAt: new Date() }
    })
    return success(res, { success: true })
  } catch (e) {
    next(e)
  }
})

module.exports = router
