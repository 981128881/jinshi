const express = require('express')
const prisma = require('../db/prisma')
const config = require('../config')
const { formatUser } = require('../db/formatters')
const { success, fail } = require('../utils/response')
const { signToken } = require('../utils/jwt')
const { code2Session, getPhoneNumber } = require('../utils/wx')

const router = express.Router()

function buildAuthResult(user) {
  const token = signToken({ userId: user.id })
  return { token, userInfo: formatUser(user) }
}

function authModeHint() {
  return {
    mock: !!config.wx.mock,
    configured: !!(config.wx.appId && config.wx.secret)
  }
}

/** 调试：查看微信登录配置状态（不含密钥） */
router.get('/wx-status', (req, res) => {
  return success(res, {
    ...authModeHint(),
    appId: config.wx.appId ? `${config.wx.appId.slice(0, 6)}****` : ''
  })
})

router.post('/wx-login', async (req, res, next) => {
  try {
    if (!config.wx.mock && (!config.wx.appId || !config.wx.secret)) {
      return fail(res, 503, '服务器未配置微信登录，请填写 WX_APPID / WX_SECRET 后重启', 503)
    }
    const { code } = req.body || {}
    if (!code) return fail(res, 400, '缺少 code')

    const { openid } = await code2Session(code)
    const user = await prisma.user.findUnique({ where: { openid } })
    if (!user) return fail(res, 401, '无有效登录态，请先授权手机号登录', 401)

    return success(res, buildAuthResult(user))
  } catch (e) {
    next(e)
  }
})

router.post('/phone-login', async (req, res, next) => {
  try {
    if (!config.wx.mock && (!config.wx.appId || !config.wx.secret)) {
      return fail(res, 503, '服务器未配置微信登录，请填写 WX_APPID / WX_SECRET 后重启', 503)
    }
    const { loginCode, phoneCode } = req.body || {}
    if (!loginCode || !phoneCode) return fail(res, 400, '缺少 loginCode 或 phoneCode')

    const { openid } = await code2Session(loginCode)
    const phoneInfo = await getPhoneNumber(phoneCode)
    const phone = phoneInfo.purePhoneNumber || phoneInfo.phoneNumber || ''

    const user = await prisma.user.upsert({
      where: { openid },
      create: { openid, nickname: '金石菜牌用户', phone },
      update: { phone }
    })

    return success(res, buildAuthResult(user))
  } catch (e) {
    next(e)
  }
})

/** 开发环境模拟登录，便于本地联调 */
router.post('/dev-login', async (req, res, next) => {
  try {
    if (process.env.DEV_LOGIN !== 'true') {
      return fail(res, 403, '开发登录未启用', 403)
    }
    const openid = 'dev_mock_openid'
    const user = await prisma.user.upsert({
      where: { openid },
      create: { openid, nickname: '测试用户', phone: '13800138000' },
      update: {}
    })
    return success(res, buildAuthResult(user))
  } catch (e) {
    next(e)
  }
})

module.exports = router
