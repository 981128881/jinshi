const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { adminRequired, assertOrgRestaurantAccess } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { pageTake, pageSkip } = require('../utils/pager')
const { resolveOrderStatusFilter } = require('../utils/reservationStatus')

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
    dailyNo: o.dailyNo || 0,
    dailyDate: o.dailyDate || '',
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
    cancelSource: o.cancelSource || '',
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

/** 纯日期补全天；带时分秒则按原值 */
function parseDateBound(v, endOfDay) {
  const s = String(v || '').trim()
  if (!s) return null
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    d.setHours(23, 59, 59, 999)
  }
  return d
}

router.get('/', requirePermission('menu:reservations'), async (req, res, next) => {
  try {
    const { status, restaurantId, keyword, page = 1, pageSize = 10, dateFrom, dateTo } = req.query
    const take = pageTake(pageSize)
    const skip = pageSkip(page, take)
    const where = {}
    const statusFilter = resolveOrderStatusFilter(status)
    if (statusFilter) where.status = statusFilter

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
      where.reserveAt = {}
      if (dateFrom) {
        const d = parseDateBound(dateFrom, false)
        if (d) where.reserveAt.gte = d
      }
      if (dateTo) {
        const d = parseDateBound(dateTo, true)
        if (d) where.reserveAt.lte = d
      }
      if (!Object.keys(where.reserveAt).length) delete where.reserveAt
    }

    const pendingWhere = { status: 'submitted' }
    if (where.restaurantId) pendingWhere.restaurantId = where.restaurantId

    const orderBy = String(status || '') === 'cancelled' ? { cancelledAt: 'desc' } : { createdAt: 'desc' }

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
    if (status === 'cancelled') {
      data.cancelledAt = new Date()
      data.cancelSource = 'admin'
    }

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
