const express = require('express')
const prisma = require('../db/prisma')
const { formatAddress } = require('../db/formatters')
const { success, fail } = require('../utils/response')
const { authRequired } = require('../middleware/auth')

const router = express.Router()
router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.address.findMany({
      where: { userId: req.userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }]
    })
    return success(res, rows.map(formatAddress))
  } catch (e) {
    next(e)
  }
})

router.get('/default', async (req, res, next) => {
  try {
    const row = await prisma.address.findFirst({
      where: { userId: req.userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }]
    })
    return success(res, row ? formatAddress(row) : null)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { name, phone, province, city, district, detail, isDefault } = req.body || {}
    if (!name || !phone) return fail(res, 400, '请填写收货人和手机号')

    const row = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: req.userId },
          data: { isDefault: false }
        })
      }
      return tx.address.create({
        data: {
          userId: req.userId,
          name,
          phone,
          province: province || '',
          city: city || '',
          district: district || '',
          detail: detail || '',
          isDefault: !!isDefault
        }
      })
    })
    return success(res, formatAddress(row))
  } catch (e) {
    next(e)
  }
})

router.post('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const existing = await prisma.address.findFirst({ where: { id, userId: req.userId } })
    if (!existing) return fail(res, 404, '地址不存在', 404)

    const { name, phone, province, city, district, detail, isDefault } = req.body || {}
    const row = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: req.userId },
          data: { isDefault: false }
        })
      }
      return tx.address.update({
        where: { id },
        data: {
          name: name ?? existing.name,
          phone: phone ?? existing.phone,
          province: province ?? existing.province,
          city: city ?? existing.city,
          district: district ?? existing.district,
          detail: detail ?? existing.detail,
          isDefault: isDefault !== undefined ? !!isDefault : existing.isDefault
        }
      })
    })
    return success(res, formatAddress(row))
  } catch (e) {
    next(e)
  }
})

router.post('/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const result = await prisma.address.deleteMany({ where: { id, userId: req.userId } })
    if (result.count === 0) return fail(res, 404, '地址不存在', 404)
    return success(res, { success: true })
  } catch (e) {
    next(e)
  }
})

module.exports = router
