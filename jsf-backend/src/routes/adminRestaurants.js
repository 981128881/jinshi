const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { adminRequired, assertOrgRestaurantAccess } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { isOrgAdmin } = require('../constants/adminPermissions')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { ensureRestaurantWxaCode } = require('../utils/wxacode')
const {
  upsertMerchantAppAccount,
  getMerchantAppAccountByRestaurant,
  deleteMerchantAppAccount,
  ensureOwnerAppAccount,
  resetOwnerAppPasswordToPhone,
  normalizePhone
} = require('../services/merchantAppAuth')

const router = express.Router()
router.use(adminRequired)

function denyOtherRestaurant(req, res, restaurantId) {
  if (!assertOrgRestaurantAccess(req, restaurantId)) {
    fail(res, 403, '无权访问其他门店', 403)
    return true
  }
  return false
}

function formatRestaurant(row) {
  return {
    id: row.id,
    name: row.name,
    logo: resolvePublicUrl(row.logo || ''),
    coverImage: resolvePublicUrl(row.coverImage || ''),
    cuisineTypeId: row.cuisineTypeId,
    cuisineName: row.cuisineType?.name || '',
    phone: row.phone || '',
    address: row.address || '',
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description || '',
    monthlySales: row.monthlySales,
    status: row.status,
    open: row.open,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dishCount: row._count?.dishes ?? undefined,
    orderCount: row._count?.orders ?? undefined
  }
}

router.get('/', requirePermission('menu:restaurants'), async (req, res, next) => {
  try {
    const { keyword, status, page = 1, pageSize = 10 } = req.query
    const take = Number(pageSize) || 10
    const skip = ((Number(page) || 1) - 1) * take
    const where = {}
    // 门店账号只能看自己的餐厅
    if (isOrgAdmin(req.admin)) {
      where.id = Number(req.admin.restaurantId)
    } else {
      if (status) where.status = String(status)
      const kw = (keyword || '').trim()
      if (kw) {
        where.OR = [
          { name: { contains: kw } },
          { phone: { contains: kw } },
          { address: { contains: kw } }
        ]
      }
    }

    const [rows, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        include: {
          cuisineType: true,
          _count: { select: { dishes: true, orders: true } }
        },
        orderBy: { id: 'desc' },
        skip,
        take
      }),
      prisma.restaurant.count({ where })
    ])
    return success(res, { list: rows.map(formatRestaurant), total })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', requirePermission('menu:restaurants'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (denyOtherRestaurant(req, res, id)) return
    const row = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        cuisineType: true,
        _count: { select: { dishes: true, orders: true } }
      }
    })
    if (!row) return fail(res, 404, '餐厅不存在', 404)
    const appAccount = await getMerchantAppAccountByRestaurant(id)
    return success(res, { ...formatRestaurant(row), appAccount })
  } catch (e) {
    next(e)
  }
})

router.get('/:id/wxacode', requirePermission('menu:restaurants'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (denyOtherRestaurant(req, res, id)) return
    const row = await prisma.restaurant.findUnique({ where: { id }, select: { id: true } })
    if (!row) return fail(res, 404, '餐厅不存在', 404)
    return success(res, await ensureRestaurantWxaCode(id))
  } catch (e) {
    next(e)
  }
})

router.post('/', requirePermission('restaurant:edit'), async (req, res, next) => {
  try {
    if (isOrgAdmin(req.admin)) {
      return fail(res, 403, '门店账号不能新建餐厅', 403)
    }
    const body = req.body || {}
    const name = String(body.name || '').trim()
    if (!name) return fail(res, 400, '餐厅名称不能为空')
    const row = await prisma.restaurant.create({
      data: {
        name,
        logo: body.logo || '',
        coverImage: body.coverImage || '',
        cuisineTypeId: body.cuisineTypeId ? Number(body.cuisineTypeId) : null,
        phone: body.phone || '',
        address: body.address || '',
        latitude: Number(body.latitude) || 0,
        longitude: Number(body.longitude) || 0,
        description: body.description || '',
        status: body.status || 'approved',
        open: body.open !== false
      },
      include: { cuisineType: true }
    })
    return success(res, formatRestaurant(row))
  } catch (e) {
    next(e)
  }
})

router.put('/:id', requirePermission('restaurant:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (denyOtherRestaurant(req, res, id)) return
    const body = req.body || {}
    const data = {}
    if (body.name != null) data.name = String(body.name).trim()
    if (body.logo != null) data.logo = body.logo
    if (body.coverImage != null) data.coverImage = body.coverImage
    if (body.cuisineTypeId !== undefined) {
      data.cuisineTypeId = body.cuisineTypeId ? Number(body.cuisineTypeId) : null
    }
    if (body.phone != null) data.phone = body.phone
    if (body.address != null) data.address = body.address
    if (body.latitude != null) data.latitude = Number(body.latitude) || 0
    if (body.longitude != null) data.longitude = Number(body.longitude) || 0
    if (body.description != null) data.description = body.description
    // 门店账号不能改审核状态
    if (body.status != null && !isOrgAdmin(req.admin)) data.status = String(body.status)
    if (body.open != null) data.open = !!body.open

    const row = await prisma.restaurant.update({
      where: { id },
      data,
      include: { cuisineType: true }
    })
    return success(res, formatRestaurant(row))
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, '餐厅不存在', 404)
    next(e)
  }
})

router.put('/:id/open', requirePermission('restaurant:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (denyOtherRestaurant(req, res, id)) return
    const open = !!req.body?.open
    const row = await prisma.restaurant.update({ where: { id }, data: { open } })
    return success(res, { id: row.id, open: row.open })
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, '餐厅不存在', 404)
    next(e)
  }
})

router.put('/:id/status', requirePermission('restaurant:edit'), async (req, res, next) => {
  try {
    if (isOrgAdmin(req.admin)) {
      return fail(res, 403, '门店账号不能修改审核状态', 403)
    }
    const id = Number(req.params.id)
    const status = String(req.body?.status || '')
    if (!['approved', 'disabled', 'pending', 'rejected', 'draft'].includes(status)) {
      return fail(res, 400, '状态无效')
    }
    const row = await prisma.restaurant.update({ where: { id }, data: { status } })
    return success(res, { id: row.id, status: row.status })
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, '餐厅不存在', 404)
    next(e)
  }
})

/** 商家 App 账号 */
router.get('/:id/app-account', requirePermission('restaurant:app-account'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (denyOtherRestaurant(req, res, id)) return
    const account = await getMerchantAppAccountByRestaurant(id)
    return success(res, account)
  } catch (e) {
    next(e)
  }
})

router.post('/:id/app-account', requirePermission('restaurant:app-account'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    // 门店账号只能重置/改自己的密码，不能换绑用户名到别人
    const body = req.body || {}
    if (isOrgAdmin(req.admin) && body.username && normalizePhone(body.username) !== normalizePhone(req.admin.username)) {
      return fail(res, 403, '不能修改登录账号（用户名）', 403)
    }
    // 未显式传密码时：按店主手机号自动开通（账号/默认密码=手机号）
    if (!body.password && !body.username) {
      const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
      if (!restaurant) return fail(res, 404, '餐厅不存在', 404)
      const row = await ensureOwnerAppAccount(restaurantId, restaurant.phone || body.phone)
      return success(res, {
        id: row.id,
        username: row.username,
        enabled: row.enabled,
        restaurantId: row.restaurantId,
        defaultPasswordHint: '默认密码为店主手机号'
      })
    }
    const phone = normalizePhone(body.username || body.phone)
    const password = body.password || phone
    const row = await upsertMerchantAppAccount(restaurantId, {
      username: body.username || phone,
      password,
      enabled: isOrgAdmin(req.admin) ? undefined : body.enabled
    })
    return success(res, {
      id: row.id,
      username: row.username,
      enabled: row.enabled,
      restaurantId: row.restaurantId,
      defaultPasswordHint: body.password ? undefined : '默认密码为店主手机号'
    })
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

router.put('/:id/app-account', requirePermission('restaurant:app-account'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const body = { ...(req.body || {}) }
    if (isOrgAdmin(req.admin)) {
      // 店主只能改密码，不能改用户名/禁用自己
      delete body.username
      delete body.enabled
      if (!body.password) return fail(res, 400, '请填写新密码')
    }
    const row = await upsertMerchantAppAccount(restaurantId, body)
    return success(res, {
      id: row.id,
      username: row.username,
      enabled: row.enabled,
      restaurantId: row.restaurantId
    })
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

/** 重置密码为餐厅手机号，账号同步为手机号 */
router.post('/:id/app-account/reset-password', requirePermission('restaurant:app-account'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const row = await resetOwnerAppPasswordToPhone(restaurantId)
    return success(res, {
      id: row.id,
      username: row.username,
      enabled: row.enabled,
      restaurantId: row.restaurantId,
      defaultPasswordHint: '密码已重置为店主手机号'
    }, '已重置为手机号密码')
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

router.delete('/:id/app-account', requirePermission('restaurant:app-account'), async (req, res, next) => {
  try {
    if (isOrgAdmin(req.admin)) {
      return fail(res, 403, '门店账号不能删除登录账号', 403)
    }
    const result = await deleteMerchantAppAccount(Number(req.params.id))
    return success(res, result)
  } catch (e) {
    next(e)
  }
})

/** 菜单分类 */
router.get('/:id/categories', requirePermission('menu:restaurants', 'menu:dishes', 'restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const list = await prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }]
    })
    return success(res, list)
  } catch (e) {
    next(e)
  }
})

router.post('/:id/categories', requirePermission('restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const name = String(req.body?.name || '').trim()
    if (!name) return fail(res, 400, '分类名不能为空')
    const row = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name,
        sort: Number(req.body?.sort) || 0,
        visible: req.body?.visible !== false
      }
    })
    return success(res, row)
  } catch (e) {
    next(e)
  }
})

router.put('/:id/categories/:categoryId', requirePermission('restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const categoryId = Number(req.params.categoryId)
    const existing = await prisma.menuCategory.findFirst({ where: { id: categoryId, restaurantId } })
    if (!existing) return fail(res, 404, '分类不存在', 404)
    const body = req.body || {}
    const row = await prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        name: body.name != null ? String(body.name).trim() : undefined,
        sort: body.sort != null ? Number(body.sort) : undefined,
        visible: body.visible != null ? !!body.visible : undefined
      }
    })
    return success(res, row)
  } catch (e) {
    next(e)
  }
})

router.delete('/:id/categories/:categoryId', requirePermission('restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const categoryId = Number(req.params.categoryId)
    const dishCount = await prisma.dish.count({ where: { categoryId, restaurantId } })
    if (dishCount > 0) return fail(res, 400, '分类下仍有菜品，无法删除')
    await prisma.menuCategory.deleteMany({ where: { id: categoryId, restaurantId } })
    return success(res, { success: true })
  } catch (e) {
    next(e)
  }
})

/** 菜品 */
router.get('/:id/dishes', requirePermission('menu:restaurants', 'menu:dishes', 'restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const list = await prisma.dish.findMany({
      where: { restaurantId },
      orderBy: [{ sort: 'asc' }, { id: 'desc' }]
    })
    return success(res, list.map((d) => ({ ...d, image: resolvePublicUrl(d.image || '') })))
  } catch (e) {
    next(e)
  }
})

router.post('/:id/dishes', requirePermission('restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const { name, price, categoryId, image, desc, visible, sort } = req.body || {}
    if (!name || price == null || !categoryId) return fail(res, 400, '名称、价格、分类必填')
    const cat = await prisma.menuCategory.findFirst({
      where: { id: Number(categoryId), restaurantId }
    })
    if (!cat) return fail(res, 400, '分类不存在')
    const row = await prisma.dish.create({
      data: {
        restaurantId,
        categoryId: Number(categoryId),
        name: String(name).trim(),
        price: Number(price),
        image: image || '',
        desc: desc || '',
        visible: visible !== false,
        sort: Number(sort) || 0
      }
    })
    return success(res, { ...row, image: resolvePublicUrl(row.image || '') })
  } catch (e) {
    next(e)
  }
})

router.put('/:id/dishes/:dishId', requirePermission('restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const dishId = Number(req.params.dishId)
    const existing = await prisma.dish.findFirst({ where: { id: dishId, restaurantId } })
    if (!existing) return fail(res, 404, '菜品不存在', 404)
    const body = req.body || {}
    if (body.categoryId != null) {
      const cat = await prisma.menuCategory.findFirst({
        where: { id: Number(body.categoryId), restaurantId }
      })
      if (!cat) return fail(res, 400, '分类不存在')
    }
    const row = await prisma.dish.update({
      where: { id: dishId },
      data: {
        name: body.name != null ? String(body.name).trim() : undefined,
        price: body.price != null ? Number(body.price) : undefined,
        categoryId: body.categoryId != null ? Number(body.categoryId) : undefined,
        image: body.image != null ? body.image : undefined,
        desc: body.desc != null ? body.desc : undefined,
        visible: body.visible != null ? !!body.visible : undefined,
        sort: body.sort != null ? Number(body.sort) : undefined
      }
    })
    return success(res, { ...row, image: resolvePublicUrl(row.image || '') })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id/dishes/:dishId', requirePermission('restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const dishId = Number(req.params.dishId)
    const result = await prisma.dish.deleteMany({ where: { id: dishId, restaurantId } })
    if (!result.count) return fail(res, 404, '菜品不存在', 404)
    return success(res, { success: true })
  } catch (e) {
    next(e)
  }
})

module.exports = router
