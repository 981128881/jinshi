const express = require('express')
const { getShopConfig } = require('../services/shop')
const { resolveRegion } = require('../services/geocode')
const { success } = require('../utils/response')

const router = express.Router()

router.get('/shop', async (req, res, next) => {
  try {
    return success(res, await getShopConfig())
  } catch (e) {
    next(e)
  }
})

router.get('/reverse-geocode', async (req, res, next) => {
  try {
    const latitude = Number(req.query.latitude)
    const longitude = Number(req.query.longitude)
    const region = await resolveRegion(latitude, longitude)
    return success(res, region)
  } catch (e) {
    next(e)
  }
})

module.exports = router
