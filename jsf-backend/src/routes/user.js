const express = require('express')
const prisma = require('../db/prisma')
const { formatUser } = require('../db/formatters')
const { success, fail } = require('../utils/response')
const { authRequired } = require('../middleware/auth')
const { getUserOrderCounts } = require('../services/orderCounts')
const { toStoredPath, resolvePublicUrl } = require('../utils/publicUrl')
const upload = require('../middleware/upload')

const router = express.Router()
router.use(authRequired)

router.get('/order-counts', async (req, res, next) => {
  try {
    const counts = await getUserOrderCounts(req.userId)
    return success(res, counts)
  } catch (e) {
    next(e)
  }
})

router.get('/info', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    return success(res, formatUser(user))
  } catch (e) {
    next(e)
  }
})

/** 更新昵称 / 头像 */
router.put('/profile', async (req, res, next) => {
  try {
    const nickname = String(req.body?.nickname || '').trim()
    const avatarRaw = String(req.body?.avatar || '').trim()
    const data = {}

    if (nickname) {
      if (nickname.length > 32) return fail(res, 400, '昵称最多 32 个字')
      data.nickname = nickname
    }
    if (avatarRaw) {
      if (avatarRaw.length > 500) return fail(res, 400, '头像地址过长')
      data.avatar = toStoredPath(avatarRaw)
    }
    if (!Object.keys(data).length) return fail(res, 400, '没有可更新的内容')

    const user = await prisma.user.update({
      where: { id: req.userId },
      data
    })
    return success(res, formatUser(user))
  } catch (e) {
    next(e)
  }
})

/** 上传头像 */
router.post('/avatar', (req, res, next) => {
  req.body = req.body || {}
  req.body.type = 'avatar'
  upload.single('file')(req, res, async (err) => {
    if (err) return next(err)
    try {
      if (!req.file) return fail(res, 400, '请选择图片')
      const stored = `/static/uploads/avatars/${req.file.filename}`
      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: stored }
      })
      return success(res, {
        ...formatUser(user),
        url: resolvePublicUrl(stored)
      })
    } catch (e) {
      next(e)
    }
  })
})

module.exports = router
