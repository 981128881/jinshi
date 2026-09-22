const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { adminRequired, assertOrgRestaurantAccess } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { pageTake, pageSkip } = require('../utils/pager')

const router = express.Router()
router.use(adminRequired)

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
    userId: o.userId,
    userNickname: o.user?.nickname || '',
    userPhone: o.user?.phone || '',
    items: (o.items || []).map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      image: resolvePublicUrl(it.image || '')
    }))
  }
}

router.get('/', requirePermission('menu:reservations'), async (req, res, next) => {
  try {
    const { status, restaurantId, keyword, page = 1, pageSize = 10, dateFrom, dateTo } = req.query
    const take = pageTake(pageSize)
    const skip = pageSkip(page, take)
    const where = {}
    if (status) where.status = String(status)

    if (req.admin.restaurantId) {
      where.restaurantId = Number(req.admin.restaurantId)
    } else if (restaurantId) {
      where.restaurantId = Number(restaurantId)
    }

    const kw = (keyword || '').trim()
    if (kw) {
      where.OR = [
        { id: { contains: kw } },
        { contactName: { contains: kw } },
        { contactPhone: { contains: kw } },
        { restaurant: { name: { contains: kw } } }
      ]
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        const d = new Date(dateFrom)
        if (!Number.isNaN(d.getTime())) where.createdAt.gte = d
      }
      if (dateTo) {
        const d = new Date(dateTo)
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999)
          where.createdAt.lte = d
        }
      }
      if (!Object.keys(where.createdAt).length) delete where.createdAt
    }

    const pendingWhere = { status: 'submitted' }
    if (where.restaurantId) pendingWhere.restaurantId = where.restaurantId

    const orderBy =
      where.status === 'cancelled' ? { cancelledAt: 'desc' } : { createdAt: 'desc' }

    const [orders, total, pendingSubmitted] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, user: true, restaurant: true },
        orderBy,
        skip,
        take
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: pendingWhere })
    ])

    return success(res, {
      list: orders.map(formatOrder),
      total,
      pendingSubmitted
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requirePermission('menu:reservations'), async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, user: true, restaurant: true }
    })
    if (!order) return fail(res, 404, '预约单不存在', 404)
    if (!assertOrgRestaurantAccess(req, order.restaurantId)) {
      return fail(res, 403, '无权访问其他门店预约单', 403)
    }
    return success(res, formatOrder(order))
  } catch (e) {
    next(e)
  }
})

router.post('/:id/status', requirePermission('reservation:status'), async (req, res, next) => {
  try {
    const status = String(req.body?.status || '')
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return fail(res, 404, '预约单不存在', 404)
    if (!assertOrgRestaurantAccess(req, order.restaurantId)) {
      return fail(res, 403, '无权操作其他门店预约单', 403)
    }
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
    if (status === 'cancelled') {
      const { notifyReservationCancelled } = require('../services/reservationSubscribe')
      notifyReservationCancelled(updated, '平台取消预约').catch(() => {})
    }
    return success(res, formatOrder(updated))
  } catch (e) {
    next(e)
  }
})

module.exports = router
