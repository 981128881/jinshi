const express = require('express')
const { getCategories } = require('../services/shop')
const { success } = require('../utils/response')

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    return success(res, await getCategories())
  } catch (e) {
    next(e)
  }
})

module.exports = router
