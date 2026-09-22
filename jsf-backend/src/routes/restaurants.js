const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { parseDishTags, parseDishSales } = require('../utils/dishTags')
const { verifyToken } = require('../utils/jwt')
const { getOrSet, CACHE_KEYS } = require('../db/redis')

const router = express.Router()
const LIST_TAKE = 50

function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || Number.isNaN(Number(v)))) return null
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function tryUserId(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  try {
    const payload = verifyToken(token)
    return payload.userId || null
  } catch (e) {
    return null
  }
}

function mapRestaurant(row, extra = {}) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    logo: resolvePublicUrl(row.logo || ''),
    coverImage: resolvePublicUrl(row.coverImage || ''),
    cuisineTypeId: row.cuisineTypeId,
    cuisineName: row.cuisineType?.name || '',
    phone: row.phone,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description || '',
    monthlySales: row.monthlySales || 0,
    open: row.open,
    status: row.status,
    distanceKm: extra.distanceKm != null ? Number(extra.distanceKm.toFixed(1)) : null,
    visited: !!extra.visited,
    lastOrderedAt: extra.lastOrderedAt || null
  }
}

/** 首页列表精简字段，避免 Text description 放大包体 */
function mapRestaurantCard(row, extra = {}) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    logo: resolvePublicUrl(row.logo || ''),
    coverImage: resolvePublicUrl(row.coverImage || ''),
    cuisineTypeId: row.cuisineTypeId,
    cuisineName: row.cuisineType?.name || '',
    latitude: row.latitude,
    longitude: row.longitude,
    monthlySales: row.monthlySales || 0,
    open: row.open,
    status: row.status,
    distanceKm: extra.distanceKm != null ? Number(extra.distanceKm.toFixed(1)) : null,
    visited: !!extra.visited,
    lastOrderedAt: extra.lastOrderedAt || null
  }
}

function mapDish(row) {
  if (!row) return null
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    price: row.price,
    image: resolvePublicUrl(row.image || ''),
    desc: row.desc || '',
    visible: row.visible,
    tags: parseDishTags(row.tags),
    sales: parseDishSales(row.sales) ?? 0
  }
}

/** 平台品类 */
router.get('/cuisine-types', async (req, res, next) => {
  try {
    const data = await getOrSet(CACHE_KEYS.CUISINE_TYPES, 600, async () => {
      const list = await prisma.cuisineType.findMany({
        where: { visible: true },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, icon: true, iconImage: true }
      })
      return list.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        iconImage: resolvePublicUrl(c.iconImage || '')
      }))
    })
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

/** 已入驻餐厅列表：sort=recommend|sales|distance */
router.get('/', async (req, res, next) => {
  try {
    const { cuisineTypeId, keyword, sort = 'recommend', lat, lng } = req.query
    const userLat = lat != null && lat !== '' ? Number(lat) : null
    const userLng = lng != null && lng !== '' ? Number(lng) : null
    const hasLoc = userLat != null && userLng != null && !Number.isNaN(userLat) && !Number.isNaN(userLng)

    const where = { status: 'approved' }
    if (cuisineTypeId) where.cuisineTypeId = Number(cuisineTypeId)
    if (keyword) where.name = { contains: String(keyword) }

    const list = await prisma.restaurant.findMany({
      where,
      take: LIST_TAKE,
      select: {
        id: true,
        name: true,
        logo: true,
        coverImage: true,
        cuisineTypeId: true,
        latitude: true,
        longitude: true,
        monthlySales: true,
        open: true,
        status: true,
        cuisineType: { select: { name: true } }
      }
    })

    const userId = tryUserId(req)
    /** @type {Map<number, Date>} */
    const visitedMap = new Map()
    if (userId && list.length) {
      const ids = list.map((r) => r.id)
      const visits = await prisma.order.groupBy({
        by: ['restaurantId'],
        where: {
          userId,
          status: { not: 'cancelled' },
          restaurantId: { in: ids }
        },
        _max: { createdAt: true }
      })
      for (const v of visits) {
        if (v._max?.createdAt) visitedMap.set(v.restaurantId, v._max.createdAt)
      }
    }

    const enriched = list.map((row) => {
      const distanceKm = hasLoc
        ? haversineKm(userLat, userLng, row.latitude, row.longitude)
        : null
      const lastOrderedAt = visitedMap.get(row.id) || null
      return {
        row,
        distanceKm,
        visited: visitedMap.has(row.id),
        lastOrderedAt
      }
    })

    const mode = String(sort || 'recommend')
    enriched.sort((a, b) => {
      if (mode === 'sales') {
        return (b.row.monthlySales || 0) - (a.row.monthlySales || 0) || b.row.id - a.row.id
      }
      if (mode === 'distance') {
        const da = a.distanceKm == null ? Number.POSITIVE_INFINITY : a.distanceKm
        const db = b.distanceKm == null ? Number.POSITIVE_INFINITY : b.distanceKm
        return da - db || b.row.id - a.row.id
      }
      // recommend: visited first (by last order desc), then distance asc
      if (a.visited !== b.visited) return a.visited ? -1 : 1
      if (a.visited && b.visited) {
        const ta = a.lastOrderedAt ? new Date(a.lastOrderedAt).getTime() : 0
        const tb = b.lastOrderedAt ? new Date(b.lastOrderedAt).getTime() : 0
        if (tb !== ta) return tb - ta
      }
      const da = a.distanceKm == null ? Number.POSITIVE_INFINITY : a.distanceKm
      const db = b.distanceKm == null ? Number.POSITIVE_INFINITY : b.distanceKm
      if (da !== db) return da - db
      return b.row.id - a.row.id
    })

    return success(res, enriched.map((e) => mapRestaurantCard(e.row, e)))
  } catch (e) {
    next(e)
  }
})

/** 餐厅详情 + 菜单 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const row = await prisma.restaurant.findFirst({
      where: { id, status: 'approved' },
      include: { cuisineType: true }
    })
    if (!row) return fail(res, 404, '餐厅不存在', 404)

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: id, visible: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      include: {
        dishes: {
          where: { visible: true },
          orderBy: [{ sort: 'asc' }, { id: 'asc' }]
        }
      }
    })

    return success(res, {
      restaurant: mapRestaurant(row),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        dishes: c.dishes.map(mapDish)
      }))
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router
