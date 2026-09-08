const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { authRequired } = require('../middleware/auth')
const { resolvePublicUrl } = require('../utils/publicUrl')

const router = express.Router()

function orderId() {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `R${t}${r}`.slice(0, 32)
}

function mapOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    restaurantName: row.restaurant?.name || '',
    restaurantAddress: row.restaurant?.address || '',
    restaurantPhone: row.restaurant?.phone || '',
    status: row.status,
    totalAmount: row.totalAmount,
    remark: row.remark || '',
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    reserveAt: row.reserveAt || null,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    readyAt: row.readyAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    items: (row.items || []).map((it) => ({
      id: it.id,
      dishId: it.dishId,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      image: resolvePublicUrl(it.image || '')
    }))
  }
}

/** 提交到店预约单（无支付） */
router.post('/', authRequired, async (req, res, next) => {
  try {
    const {
      restaurantId,
      items,
      remark,
      contactName,
      contactPhone,
      reserveAt,
      reserveDate,
      reserveTime
    } = req.body || {}
    const rid = Number(restaurantId)
    if (!rid) return fail(res, 400, '缺少餐厅')
    if (!Array.isArray(items) || items.length === 0) return fail(res, 400, '请选择菜品')

    const name = String(contactName || '').trim()
    const phone = String(contactPhone || '').trim()
    if (!name) return fail(res, 400, '请填写下单人姓名')
    if (!/^1\d{10}$/.test(phone)) return fail(res, 400, '请填写正确的手机号')

    let reserveDateTime = null
    if (reserveAt) {
      reserveDateTime = new Date(reserveAt)
    } else if (reserveDate && reserveTime) {
      // reserveDate: YYYY-MM-DD, reserveTime: HH:mm
      reserveDateTime = new Date(`${reserveDate}T${reserveTime}:00`)
    }
    if (!reserveDateTime || Number.isNaN(reserveDateTime.getTime())) {
      return fail(res, 400, '请选择预约日期和时间')
    }
    if (reserveDateTime.getTime() < Date.now() - 60 * 1000) {
      return fail(res, 400, '预约时间不能早于当前时间')
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: rid, status: 'approved', open: true }
    })
    if (!restaurant) return fail(res, 400, '餐厅不可预约')

    const dishIds = items.map((i) => Number(i.dishId)).filter(Boolean)
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds }, restaurantId: rid, visible: true }
    })
    const dishMap = new Map(dishes.map((d) => [d.id, d]))

    const lines = []
    let total = 0
    for (const it of items) {
      const dish = dishMap.get(Number(it.dishId))
      if (!dish) return fail(res, 400, '菜品无效或不属于该餐厅')
      const qty = Math.max(1, Number(it.quantity) || 1)
      total += dish.price * qty
      lines.push({
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: qty,
        image: dish.image || ''
      })
    }

    const id = orderId()
    const order = await prisma.order.create({
      data: {
        id,
        userId: req.userId,
        restaurantId: rid,
        status: 'submitted',
        totalAmount: Math.round(total * 100) / 100,
        remark: remark || '',
        contactName: name,
        contactPhone: phone,
        reserveAt: reserveDateTime,
        items: { create: lines }
      },
      include: { items: true, restaurant: true }
    })

    // 通知商家（复用 Redis pub，失败不影响下单）
    try {
      const { publishMerchantNotify } = require('../services/merchantNotify')
      if (typeof publishMerchantNotify === 'function') {
        await publishMerchantNotify({
          type: 'reservation',
          orderId: order.id,
          restaurantId: rid,
          totalAmount: order.totalAmount
        })
      }
    } catch (_) { /* ignore */ }

    return success(res, mapOrder(order), '预约成功')
  } catch (e) {
    next(e)
  }
})

/** 我的预约单 */
router.get('/mine', authRequired, async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const where = { userId: req.userId }
    if (status && status !== 'all' && status !== '0') {
      where.status = status
    }
    const list = await prisma.order.findMany({
      where,
      include: { items: true, restaurant: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return success(res, list.map(mapOrder))
  } catch (e) {
    next(e)
  }
})

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const row = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { items: true, restaurant: true }
    })
    if (!row) return fail(res, 404, '订单不存在', 404)
    return success(res, mapOrder(row))
  } catch (e) {
    next(e)
  }
})

/** 用户取消（仅 submitted） */
router.post('/:id/cancel', authRequired, async (req, res, next) => {
  try {
    const row = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!row) return fail(res, 404, '订单不存在', 404)
    if (row.status !== 'submitted') return fail(res, 400, '当前状态不可取消')
    const updated = await prisma.order.update({
      where: { id: row.id },
      data: { status: 'cancelled', cancelledAt: new Date() },
      include: { items: true, restaurant: true }
    })
    return success(res, mapOrder(updated))
  } catch (e) {
    next(e)
  }
})

module.exports = router
