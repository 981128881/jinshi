const express = require('express')
const prisma = require('../db/prisma')
const { parseProduct } = require('../db/formatters')
const { success, fail } = require('../utils/response')
const { authRequired } = require('../middleware/auth')

const router = express.Router()
router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.cartItem.findMany({
      where: { userId: req.userId },
      include: { product: true },
      orderBy: { id: 'desc' }
    })
    const data = rows.map((c) => ({
      id: c.id,
      productId: c.productId,
      quantity: c.quantity,
      product: parseProduct(c.product)
    }))
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body || {}
    if (!productId) return fail(res, 400, '缺少 productId')

    const product = await prisma.product.findUnique({ where: { id: Number(productId) } })
    if (!product) return fail(res, 404, '商品不存在', 404)

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: req.userId, productId: Number(productId) } }
    })

    if (existing) {
      const row = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (Number(quantity) || 1) }
      })
      return success(res, { id: row.id, productId: row.productId, quantity: row.quantity })
    }

    const row = await prisma.cartItem.create({
      data: {
        userId: req.userId,
        productId: Number(productId),
        quantity: Number(quantity) || 1
      }
    })
    return success(res, { id: row.id, productId: row.productId, quantity: row.quantity })
  } catch (e) {
    next(e)
  }
})

router.post('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { quantity } = req.body || {}
    if (!quantity || quantity < 1) return fail(res, 400, '数量无效')

    const item = await prisma.cartItem.findFirst({ where: { id, userId: req.userId } })
    if (!item) return fail(res, 404, '购物车项不存在', 404)

    const row = await prisma.cartItem.update({ where: { id }, data: { quantity } })
    return success(res, { id: row.id, quantity: row.quantity })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const result = await prisma.cartItem.deleteMany({ where: { id, userId: req.userId } })
    if (result.count === 0) return fail(res, 404, '购物车项不存在', 404)
    return success(res, { success: true })
  } catch (e) {
    next(e)
  }
})

module.exports = router
