const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { adminRequired, assertOrgRestaurantAccess } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { resolvePublicUrl, toStoredPath } = require('../utils/publicUrl')
const { parseDishTags, parseDishPrice, parseDishSales } = require('../utils/dishTags')
const { allocRestaurantCode } = require('../utils/restaurantCode')
const { pageTake, pageSkip } = require('../utils/pager')
const { ensureRestaurantWxaCode } = require('../utils/wxacode')
const { normalizeHm, isEffectivelyOpen } = require('../utils/businessHours')
const { hashPassword } = require('../utils/password')
const { resolveLockedImageUpdate } = require('../utils/lockedImage')

const router = express.Router()
router.use(adminRequired)

/** 非整数 :id（如 abc）直接 400，避免 Prisma 吃到 NaN 变 500 */
router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value))) return fail(res, 400, '无效的餐厅ID', 400)
  next()
})

function denyOtherRestaurant(req, res, restaurantId) {
  if (!assertOrgRestaurantAccess(req, restaurantId)) {
    fail(res, 403, '无权访问其他门店', 403)
    return true
  }
  return false
}

function formatDish(row) {
  return {
    ...row,
    image: resolvePublicUrl(row.image || ''),
    tags: parseDishTags(row.tags),
    sales: parseDishSales(row.sales) ?? 0
  }
}

function formatRestaurant(row) {
  return {
    id: row.id,
    code: row.code || '',
    name: row.name,
    logo: resolvePublicUrl(row.logo || ''),
    coverImage: resolvePublicUrl(row.coverImage || ''),
    licenseImage: resolvePublicUrl(row.licenseImage || ''),
    foodSafetyLicenseImage: resolvePublicUrl(row.foodSafetyLicenseImage || ''),
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
    openTime: row.openTime || '',
    closeTime: row.closeTime || '',
    effectivelyOpen: isEffectivelyOpen(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dishCount: row._count?.dishes ?? undefined,
    orderCount: row._count?.orders ?? undefined
  }
}

router.get('/', requirePermission('menu:restaurants'), async (req, res, next) => {
  try {
    const { keyword, status, page = 1, pageSize = 10 } = req.query
    const take = pageTake(pageSize)
    const skip = pageSkip(page, take)
    const where = {}
    if (req.admin.restaurantId) where.id = Number(req.admin.restaurantId)
    if (status) where.status = String(status)
    const kw = (keyword || '').trim()
    if (kw) {
      where.OR = [
        { name: { contains: kw } },
        { phone: { contains: kw } },
        { address: { contains: kw } },
        { code: { contains: kw } }
      ]
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
    return success(res, formatRestaurant(row))
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
    if (req.admin.restaurantId) return fail(res, 403, '无权创建餐厅', 403)
    const body = req.body || {}
    const name = String(body.name || '').trim()
    if (!name) return fail(res, 400, '餐厅名称不能为空')
    const row = await prisma.restaurant.create({
      data: {
        code: await allocRestaurantCode(),
        name,
        logo: toStoredPath(body.logo || ''),
        coverImage: toStoredPath(body.coverImage || ''),
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
    const isPlatformAdmin = !req.admin.restaurantId
    const needCurrent =
      body.licenseImage !== undefined || body.foodSafetyLicenseImage !== undefined
    const current = needCurrent
      ? await prisma.restaurant.findUnique({
          where: { id },
          select: { licenseImage: true, foodSafetyLicenseImage: true }
        })
      : null
    if (needCurrent && !current) return fail(res, 404, '餐厅不存在', 404)

    const data = {}
    if (body.name != null) data.name = String(body.name).trim()
    if (body.logo != null) data.logo = toStoredPath(body.logo)
    if (body.coverImage != null) data.coverImage = toStoredPath(body.coverImage)
    if (body.cuisineTypeId !== undefined) {
      data.cuisineTypeId = body.cuisineTypeId ? Number(body.cuisineTypeId) : null
    }
    if (body.phone != null) data.phone = body.phone
    if (body.address != null) data.address = body.address
    if (body.latitude != null) data.latitude = Number(body.latitude) || 0
    if (body.longitude != null) data.longitude = Number(body.longitude) || 0
    if (body.description != null) data.description = body.description
    if (body.status != null && isPlatformAdmin) data.status = String(body.status)
    if (body.open != null) data.open = !!body.open
    if (body.openTime !== undefined) {
      const t = normalizeHm(body.openTime)
      if (t == null) return fail(res, 400, '营业开始时间格式应为 HH:mm')
      data.openTime = t
    }
    if (body.closeTime !== undefined) {
      const t = normalizeHm(body.closeTime)
      if (t == null) return fail(res, 400, '营业结束时间格式应为 HH:mm')
      data.closeTime = t
    }
    try {
      const license = resolveLockedImageUpdate(current?.licenseImage, body.licenseImage, {
        isPlatformAdmin,
        label: '营业执照'
      })
      if (license !== undefined) data.licenseImage = license
      const food = resolveLockedImageUpdate(
        current?.foodSafetyLicenseImage,
        body.foodSafetyLicenseImage,
        { isPlatformAdmin, label: '食品安全许可证' }
      )
      if (food !== undefined) data.foodSafetyLicenseImage = food
    } catch (e) {
      if (e.statusCode === 403) return fail(res, 403, e.message, 403)
      throw e
    }

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

/** 设置门店后台登录密码（用户名=门店电话） */
router.put('/:id/password', requirePermission('restaurant:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (denyOtherRestaurant(req, res, id)) return
    const password = String(req.body?.password || '').trim()
    if (password.length < 6) return fail(res, 400, '密码至少 6 位')

    const restaurant = await prisma.restaurant.findUnique({ where: { id } })
    if (!restaurant) return fail(res, 404, '餐厅不存在', 404)
    const username = String(restaurant.phone || '').trim()
    if (!/^1\d{10}$/.test(username)) {
      return fail(res, 400, '请先保存有效的门店手机号（11 位）作为登录账号')
    }

    const hashed = hashPassword(password)
    const existing = await prisma.adminUser.findUnique({ where: { username } })
    if (existing) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: {
          password: hashed,
          restaurantId: id,
          nickname: restaurant.name || username,
          enabled: true,
          isSuper: false
        }
      })
    } else {
      await prisma.adminUser.create({
        data: {
          username,
          password: hashed,
          nickname: restaurant.name || username,
          enabled: true,
          isSuper: false,
          permissions: [],
          restaurantId: id
        }
      })
    }
    return success(res, { username }, '密码已设置')
  } catch (e) {
    next(e)
  }
})

router.put('/:id/status', requirePermission('restaurant:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (req.admin.restaurantId) return fail(res, 403, '无权修改审核状态', 403)
    if (denyOtherRestaurant(req, res, id)) return
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
    return success(res, list.map(formatDish))
  } catch (e) {
    next(e)
  }
})

router.post('/:id/dishes', requirePermission('restaurant:menu'), async (req, res, next) => {
  try {
    const restaurantId = Number(req.params.id)
    if (denyOtherRestaurant(req, res, restaurantId)) return
    const { name, price, categoryId, image, desc, visible, sort, tags, sales } = req.body || {}
    if (!name || !categoryId) return fail(res, 400, '名称、价格、分类必填')
    if (!String(image || '').trim()) return fail(res, 400, '请上传菜品主图')
    const parsedPrice = parseDishPrice(price)
    if (parsedPrice == null) return fail(res, 400, '价格必须是大于等于 0 的数字')
    const parsedSales = sales == null || sales === '' ? 0 : parseDishSales(sales)
    if (parsedSales == null) return fail(res, 400, '销量必须是大于等于 0 的整数')
    const cat = await prisma.menuCategory.findFirst({
      where: { id: Number(categoryId), restaurantId }
    })
    if (!cat) return fail(res, 400, '分类不存在')
    const row = await prisma.dish.create({
      data: {
        restaurantId,
        categoryId: Number(categoryId),
        name: String(name).trim(),
        price: parsedPrice,
        image: toStoredPath(image || ''),
        desc: desc || '',
        visible: visible !== false,
        sort: Number(sort) || 0,
        tags: parseDishTags(tags),
        sales: parsedSales
      }
    })
    return success(res, formatDish(row))
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
        image: body.image != null ? toStoredPath(body.image) : undefined,
        desc: body.desc != null ? body.desc : undefined,
        visible: body.visible != null ? !!body.visible : undefined,
        sort: body.sort != null ? Number(body.sort) : undefined,
        tags: body.tags !== undefined ? parseDishTags(body.tags) : undefined,
        sales: parsedSales
      }
    })
    return success(res, formatDish(row))
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
