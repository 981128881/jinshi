const express = require('express')
const { getHotKeywords } = require('../services/shop')
const { success } = require('../utils/response')

const router = express.Router()

router.get('/hot-keywords', async (req, res, next) => {
  try {
    return success(res, await getHotKeywords())
  } catch (e) {
    next(e)
  }
})

module.exports = router
