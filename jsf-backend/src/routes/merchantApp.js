const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { merchantAppRequired } = require('../middleware/merchantAppAuth')
const { loginMerchantApp, getMerchantAppProfile } = require('../services/merchantAppAuth')
const { resolvePublicUrl } = require('../utils/publicUrl')

const router = express.Router()

const NEXT = {
  submitted: ['accepted', 'cancelled'],
  accepted: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: []
}

function formatOrder(o) {
  return {
    id: o.id,
    status: o.status,
    totalAmount: o.totalAmount,
    remark: o.remark || '',
    contactName: o.contactName || '',
    contactPhone: o.contactPhone || '',
    reserveAt: o.reserveAt,
    createdAt: o.createdAt,
    acceptedAt: o.acceptedAt,
    readyAt: o.readyAt,
    completedAt: o.completedAt,
    cancelledAt: o.cancelledAt,
    restaurantId: o.restaurantId,
    restaurantName: o.restaurant?.name || '',
    userNickname: o.user?.nickname || '',
    items: (o.items || []).map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      image: resolvePublicUrl(it.image || '')
    }))
  }
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    const data = await loginMerchantApp(username, password)
    return success(res, data)
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

router.get('/me', merchantAppRequired, async (req, res, next) => {
  try {
    const profile = await getMerchantAppProfile(req.merchantApp.accountId)
    if (!profile) return fail(res, 401, '账号已禁用或不存在', 401)
    return success(res, profile)
  } catch (e) {
    next(e)
  }
})

router.get('/orders', merchantAppRequired, async (req, res, next) => {
  try {
    const restaurantId = req.merchantApp.restaurantId
    const status = req.query.status
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20))
    const where = { restaurantId }
    if (status) where.status = String(status)

    const [list, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, user: true, restaurant: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.order.count({ where })
    ])
    return success(res, { list: list.map(formatOrder), total, page, pageSize })
  } catch (e) {
    next(e)
  }
})

router.get('/orders/:id', merchantAppRequired, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, restaurantId: req.merchantApp.restaurantId },
      include: { items: true, user: true, restaurant: true }
    })
    if (!order) return fail(res, 404, '订单不存在', 404)
    return success(res, formatOrder(order))
  } catch (e) {
    next(e)
  }
})

router.post('/orders/:id/status', merchantAppRequired, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '')
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, restaurantId: req.merchantApp.restaurantId }
    })
    if (!order) return fail(res, 404, '订单不存在', 404)
    const allow = NEXT[order.status] || []
    if (!allow.includes(status)) return fail(res, 400, `不可从 ${order.status} 变为 ${status}`)

    const data = { status }
    if (status === 'accepted') data.acceptedAt = new Date()
    if (status === 'ready') data.readyAt = new Date()
    if (status === 'completed') data.completedAt = new Date()
    if (status === 'cancelled') data.cancelledAt = new Date()

    const updated = await prisma.order.update({
      where: { id: order.id },
      data,
      include: { items: true, user: true, restaurant: true }
    })
    return success(res, formatOrder(updated))
  } catch (e) {
    next(e)
  }
})

module.exports = router
