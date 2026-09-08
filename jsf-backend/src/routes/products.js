const express = require('express')
const prisma = require('../db/prisma')
const { parseProduct, parseProductListItem, PRODUCT_LIST_SELECT, PRODUCT_LIST_ORDER } = require('../db/formatters')
const { getOrSet, CACHE_KEYS } = require('../db/redis')
const { searchProducts } = require('../services/productSearch')
const { success, fail } = require('../utils/response')

const router = express.Router()

router.get('/search', async (req, res, next) => {
  try {
    const keyword = (req.query.keyword || '').trim()
    if (!keyword) {
      return success(res, { list: [], total: 0, page: 1, pageSize: 20, hasMore: false })
    }
    if (keyword.length < 2) {
      return fail(res, 400, '请输入至少 2 个字符')
    }

    const page = Math.max(Number(req.query.page) || 1, 1)
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 50)

    const cacheKey = CACHE_KEYS.searchResult(keyword, page, pageSize)
    const data = await getOrSet(cacheKey, 120, () => searchProducts(keyword, page, pageSize))

    return success(res, data)
  } catch (e) {
    next(e)
  }
})

router.get('/featured', async (req, res, next) => {
  try {
    const rawCategoryId = req.query.categoryId
    const categoryId = rawCategoryId != null && rawCategoryId !== ''
      ? Number(rawCategoryId)
      : null
    const page = Math.max(Number(req.query.page) || 1, 1)
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 50)
    const skip = (page - 1) * pageSize

    const where = {
      featured: true,
      visible: true,
      category: { visible: true },
      ...(categoryId ? { categoryId } : {})
    }

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: PRODUCT_LIST_ORDER,
        skip,
        take: pageSize,
        select: PRODUCT_LIST_SELECT
      }),
      prisma.product.count({ where })
    ])

    return success(res, {
      list: rows.map(parseProductListItem),
      total,
      page,
      pageSize,
      hasMore: skip + rows.length < total
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const row = await prisma.product.findUnique({ where: { id: Number(req.params.id) } })
    if (!row || row.visible === false) return fail(res, 404, '商品不存在', 404)
    const category = await prisma.category.findUnique({ where: { id: row.categoryId } })
    if (!category || category.visible === false) return fail(res, 404, '商品不存在', 404)
    return success(res, parseProduct(row))
  } catch (e) {
    next(e)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const { categoryId, page = 1, pageSize = 20 } = req.query
    const limit = Math.min(Number(pageSize) || 20, 100)
    const currentPage = Math.max(Number(page) || 1, 1)
    const skip = (currentPage - 1) * limit
    const excludeFeatured = req.query.excludeFeatured === '1' || req.query.excludeFeatured === 'true'
    const where = {
      visible: true,
      category: { visible: true },
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(excludeFeatured ? { featured: false } : {})
    }

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: PRODUCT_LIST_ORDER,
        skip,
        take: limit,
        select: PRODUCT_LIST_SELECT
      }),
      prisma.product.count({ where })
    ])

    return success(res, {
      list: rows.map(parseProductListItem),
      total,
      page: currentPage,
      pageSize: limit,
      hasMore: skip + rows.length < total
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router
