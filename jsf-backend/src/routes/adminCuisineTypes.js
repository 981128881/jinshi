const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { adminRequired } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { invalidateCategories } = require('../services/shop')

const router = express.Router()
router.use(adminRequired)

function formatRow(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || '',
    iconImage: resolvePublicUrl(row.iconImage || ''),
    sort: row.sort,
    visible: row.visible,
    restaurantCount: row._count?.restaurants
  }
}

router.get('/', requirePermission('menu:cuisine-types', 'menu:restaurants'), async (req, res, next) => {
  try {
    const list = await prisma.cuisineType.findMany({
      include: { _count: { select: { restaurants: true } } },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }]
    })
    return success(res, list.map(formatRow))
  } catch (e) {
    next(e)
  }
})

router.post('/', requirePermission('cuisine:create'), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    if (!name) return fail(res, 400, '品类名称不能为空')
    const row = await prisma.cuisineType.create({
      data: {
        name,
        icon: req.body?.icon || '',
        iconImage: req.body?.iconImage || '',
        sort: Number(req.body?.sort) || 0,
        visible: req.body?.visible !== false
      }
    })
    await invalidateCategories()
    return success(res, formatRow(row))
  } catch (e) {
    next(e)
  }
})

router.put('/:id', requirePermission('cuisine:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    const row = await prisma.cuisineType.update({
      where: { id },
      data: {
        name: body.name != null ? String(body.name).trim() : undefined,
        icon: body.icon != null ? body.icon : undefined,
        iconImage: body.iconImage != null ? body.iconImage : undefined,
        sort: body.sort != null ? Number(body.sort) : undefined,
        visible: body.visible != null ? !!body.visible : undefined
      }
    })
    await invalidateCategories()
    return success(res, formatRow(row))
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, '品类不存在', 404)
    next(e)
  }
})

router.delete('/:id', requirePermission('cuisine:delete'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const count = await prisma.restaurant.count({ where: { cuisineTypeId: id } })
    if (count > 0) return fail(res, 400, '仍有餐厅使用该品类，无法删除')
    await prisma.cuisineType.delete({ where: { id } })
    await invalidateCategories()
    return success(res, { success: true })
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, '品类不存在', 404)
    next(e)
  }
})

module.exports = router
