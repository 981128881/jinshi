const express = require('express')
const { success, fail } = require('../utils/response')
const { posSyncAuth } = require('../middleware/posSyncAuth')
const {
  syncCategories,
  syncBrands,
  syncProducts,
  syncStock
} = require('../services/posSyncService')

const router = express.Router()

router.use(posSyncAuth)

router.post('/categories', async (req, res, next) => {
  try {
    const items = req.body?.items
    if (!Array.isArray(items)) return fail(res, 400, 'items 须为数组')
    const data = await syncCategories(items)
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

router.post('/brands', async (req, res, next) => {
  try {
    const items = req.body?.items
    if (!Array.isArray(items)) return fail(res, 400, 'items 须为数组')
    const data = await syncBrands(items)
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

router.post('/products', async (req, res, next) => {
  try {
    const items = req.body?.items
    if (!Array.isArray(items)) return fail(res, 400, 'items 须为数组')
    const brands = req.body?.brands
    const data = await syncProducts(items, Array.isArray(brands) ? brands : [])
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

router.post('/stock', async (req, res, next) => {
  try {
    const items = req.body?.items
    if (!Array.isArray(items)) return fail(res, 400, 'items 须为数组')
    const data = await syncStock(items)
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

module.exports = router
