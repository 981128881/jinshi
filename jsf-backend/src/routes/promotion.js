const express = require('express')
const prisma = require('../db/prisma')
const { formatPromotion } = require('../db/formatters')
const { success, fail } = require('../utils/response')

const router = express.Router()

router.get('/active', async (req, res, next) => {
  try {
    const now = new Date().toISOString().slice(0, 10)
    const row = await prisma.promotion.findFirst({
      where: {
        enabled: true,
        startTime: { lte: now },
        endTime: { gte: now }
      },
      orderBy: { id: 'desc' }
    })
    return success(res, row ? formatPromotion(row) : null)
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const row = await prisma.promotion.findUnique({ where: { id: Number(req.params.id) } })
    if (!row) return fail(res, 404, '活动不存在', 404)
    return success(res, formatPromotion(row))
  } catch (e) {
    next(e)
  }
})

module.exports = router
