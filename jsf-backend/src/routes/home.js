const express = require('express')
const prisma = require('../db/prisma')
const { getBanners } = require('../services/shop')
const { success } = require('../utils/response')
const { resolvePublicUrl } = require('../utils/publicUrl')

const router = express.Router()

router.get('/banners', async (req, res, next) => {
  try {
    const data = await getBanners()
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

/** 推荐餐厅 */
router.get('/recommend', async (req, res, next) => {
  try {
    const rows = await prisma.restaurant.findMany({
      where: { status: 'approved', open: true },
      include: { cuisineType: true },
      orderBy: { id: 'desc' },
      take: 10
    })
    return success(res, rows.map((r) => ({
      id: r.id,
      name: r.name,
      logo: resolvePublicUrl(r.logo || ''),
      coverImage: resolvePublicUrl(r.coverImage || ''),
      cuisineName: r.cuisineType?.name || '',
      address: r.address,
      open: r.open
    })))
  } catch (e) {
    next(e)
  }
})

module.exports = router
