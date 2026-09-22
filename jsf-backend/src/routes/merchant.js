const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { authRequired } = require('../middleware/auth')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { parseDishTags, parseDishPrice, parseDishSales } = require('../utils/dishTags')
const { ensureRestaurantWxaCode } = require('../utils/wxacode')
const { isEffectivelyOpen } = require('../utils/businessHours')
const { resolveOrderStatusFilter } = require('../utils/reservationStatus')

const router = express.Router()

async function getMembership(userId, restaurantId) {
  return prisma.restaurantMember.findFirst({
    where: { userId, restaurantId: Number(restaurantId) }
  })
}

async function requireMember(req, res) {
  const restaurantId = Number(req.params.restaurantId || req.body?.restaurantId || req.query?.restaurantId)
  if (!restaurantId) {
    fail(res, 400, '缺少餐厅 ID')
    return null
  }
  const member = await getMembership(req.userId, restaurantId)
  if (!member) {
    fail(res, 403, '无门店权限', 403)
    return null
  }
  return { restaurantId, member }
}

/** 我管理的餐厅 */
router.get('/restaurants', authRequired, async (req, res, next) => {
  try {
    const members = await prisma.restaurantMember.findMany({
      where: { userId: req.userId },
      include: { restaurant: true }
    })
    return success(res, members.map((m) => ({
      role: m.role,
      restaurant: {
        id: m.restaurant.id,
        name: m.restaurant.name,
        logo: resolvePublicUrl(m.restaurant.logo || ''),
        coverImage: resolvePublicUrl(m.restaurant.coverImage || ''),
        open: m.restaurant.open,
        openTime: m.restaurant.openTime || '',
        closeTime: m.restaurant.closeTime || '',
        effectivelyOpen: isEffectivelyOpen(m.restaurant),
        status: m.restaurant.status,
        address: m.restaurant.address,
        phone: m.restaurant.phone || ''
      }
    })))
  } catch (e) {
    next(e)
  }
})

/** 营业开关 */
router.post('/restaurants/:restaurantId/open', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const open = !!req.body?.open
    const row = await prisma.restaurant.update({
      where: { id: ctx.restaurantId },
      data: { open }
    })
    return success(res, { id: row.id, open: row.open })
  } catch (e) {
    next(e)
  }
})

/** 官方店铺码：扫码打开 pages/restaurant/detail，scene=餐厅 id */
router.get('/restaurants/:restaurantId/wxacode', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    return success(res, await ensureRestaurantWxaCode(ctx.restaurantId))
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

/** 菜单分类列表 */
router.get('/restaurants/:restaurantId/categories', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const list = await prisma.menuCategory.findMany({
      where: { restaurantId: ctx.restaurantId },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }]
    })
    return success(res, list)
  } catch (e) {
    next(e)
  }
})

router.post('/restaurants/:restaurantId/categories', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const name = (req.body?.name || '').trim()
    if (!name) return fail(res, 400, '分类名不能为空')
    const row = await prisma.menuCategory.create({
      data: {
        restaurantId: ctx.restaurantId,
        name,
        sort: Number(req.body?.sort) || 0
      }
    })
    return success(res, row)
  } catch (e) {
    next(e)
  }
})

/** 菜品 CRUD 最小集 */
router.get('/restaurants/:restaurantId/dishes', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const list = await prisma.dish.findMany({
      where: { restaurantId: ctx.restaurantId },
      orderBy: [{ sort: 'asc' }, { id: 'desc' }]
    })
    return success(res, list.map((d) => ({
      ...d,
      image: resolvePublicUrl(d.image || ''),
      tags: parseDishTags(d.tags)
    })))
  } catch (e) {
    next(e)
  }
})

router.post('/restaurants/:restaurantId/dishes', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const { name, price, categoryId, image, desc, visible, tags, sales } = req.body || {}
    if (!name || !categoryId) return fail(res, 400, '名称、价格、分类必填')
    if (!String(image || '').trim()) return fail(res, 400, '请上传菜品主图')
    const parsedPrice = parseDishPrice(price)
    if (parsedPrice == null) return fail(res, 400, '价格必须是大于等于 0 的数字')
    const parsedSales = sales == null || sales === '' ? 0 : parseDishSales(sales)
    if (parsedSales == null) return fail(res, 400, '销量必须是大于等于 0 的整数')
    const cat = await prisma.menuCategory.findFirst({
      where: { id: Number(categoryId), restaurantId: ctx.restaurantId }
    })
    if (!cat) return fail(res, 400, '分类不存在')
    const row = await prisma.dish.create({
      data: {
        restaurantId: ctx.restaurantId,
        categoryId: Number(categoryId),
        name: String(name).trim(),
        price: parsedPrice,
        image: image || '',
        desc: desc || '',
        visible: visible !== false,
        tags: parseDishTags(tags),
        sales: parsedSales
      }
    })
    return success(res, row)
  } catch (e) {
    next(e)
  }
})

router.put('/restaurants/:restaurantId/dishes/:dishId', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const dishId = Number(req.params.dishId)
    const existing = await prisma.dish.findFirst({
      where: { id: dishId, restaurantId: ctx.restaurantId }
    })
    if (!existing) return fail(res, 404, '菜品不存在', 404)
    const body = req.body || {}
    if (body.image != null && !String(body.image || '').trim()) {
      return fail(res, 400, '请上传菜品主图')
    }
    let parsedPrice
    if (body.price !== undefined) {
      parsedPrice = parseDishPrice(body.price)
      if (parsedPrice == null) return fail(res, 400, '价格必须是大于等于 0 的数字')
    }
    let parsedSales
    if (body.sales !== undefined) {
      parsedSales = parseDishSales(body.sales)
      if (parsedSales == null) return fail(res, 400, '销量必须是大于等于 0 的整数')
    }
    const row = await prisma.dish.update({
      where: { id: dishId },
      data: {
        name: body.name != null ? String(body.name).trim() : undefined,
        price: parsedPrice,
        categoryId: body.categoryId != null ? Number(body.categoryId) : undefined,
        image: body.image != null ? body.image : undefined,
        desc: body.desc != null ? body.desc : undefined,
        visible: body.visible != null ? !!body.visible : undefined,
        sort: body.sort != null ? Number(body.sort) : undefined,
        tags: body.tags !== undefined ? parseDishTags(body.tags) : undefined,
        sales: parsedSales
      }
    })
    return success(res, row)
  } catch (e) {
    next(e)
  }
})

/** 门店预约单 */
function mapMerchantOrder(o) {
  return {
    id: o.id,
    dailyNo: o.dailyNo || 0,
    dailyDate: o.dailyDate || '',
    status: o.status,
    totalAmount: o.totalAmount,
    remark: o.remark,
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    reserveAt: o.reserveAt,
    createdAt: o.createdAt,
    userNickname: o.user?.nickname || '',
    items: o.items
  }
}

router.get('/restaurants/:restaurantId/orders', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const status = req.query.status
    const where = { restaurantId: ctx.restaurantId }
    const statusFilter = resolveOrderStatusFilter(status)
    if (statusFilter) where.status = statusFilter
    const list = await prisma.order.findMany({
      where,
      include: { items: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    return success(res, list.map(mapMerchantOrder))
  } catch (e) {
    next(e)
  }
})

router.get('/restaurants/:restaurantId/orders/:orderId', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, restaurantId: ctx.restaurantId },
      include: { items: true, user: true }
    })
    if (!order) return fail(res, 404, '订单不存在', 404)
    return success(res, mapMerchantOrder(order))
  } catch (e) {
    next(e)
  }
})

const NEXT = {
  submitted: ['accepted', 'cancelled'],
  accepted: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: []
}

router.post('/restaurants/:restaurantId/orders/:orderId/status', authRequired, async (req, res, next) => {
  try {
    const ctx = await requireMember(req, res)
    if (!ctx) return
    const status = String(req.body?.status || '')
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, restaurantId: ctx.restaurantId }
    })
    if (!order) return fail(res, 404, '订单不存在', 404)
    const allow = NEXT[order.status] || []
    if (!allow.includes(status)) return fail(res, 400, `不可从 ${order.status} 变为 ${status}`)

    const data = { status }
    if (status === 'accepted') data.acceptedAt = new Date()
    if (status === 'ready') data.readyAt = new Date()
    if (status === 'completed') data.completedAt = new Date()
    if (status === 'cancelled') {
      data.cancelledAt = new Date()
      data.cancelSource = 'merchant'
    }

    const updated = await prisma.order.update({ where: { id: order.id }, data })
    return success(res, updated)
  } catch (e) {
    next(e)
  }
})

module.exports = router
