const config = require('../config')

/** @type {{ token: string, expiresAt: number } | null} */
let memoryToken = null

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  const data = await res.json()
  return data
}

/**
 * 获取微信 access_token（内存缓存，提前 5 分钟过期）
 */
async function getAccessToken(forceRefresh = false) {
  if (!config.wx.appId || !config.wx.secret) {
    throw new Error('未配置 WX_APPID / WX_SECRET')
  }

  const now = Date.now()
  if (!forceRefresh && memoryToken && memoryToken.expiresAt > now) {
    return memoryToken.token
  }

  const url =
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential` +
    `&appid=${encodeURIComponent(config.wx.appId)}` +
    `&secret=${encodeURIComponent(config.wx.secret)}`

  const data = await fetchJson(url)
  if (data.errcode) {
    const err = new Error(mapWxAuthError(data.errcode, data.errmsg))
    err.code = data.errcode
    err.statusCode = 400
    throw err
  }
  if (!data.access_token) {
    const err = new Error('微信未返回 access_token')
    err.statusCode = 400
    throw err
  }

  const ttlMs = Math.max(60, Number(data.expires_in || 7200) - 300) * 1000
  memoryToken = {
    token: data.access_token,
    expiresAt: now + ttlMs
  }
  return memoryToken.token
}

/**
 * code 换 openid / session_key
 */
async function code2Session(code) {
  if (!config.wx.appId || !config.wx.secret) {
    throw new Error('未配置 WX_APPID / WX_SECRET')
  }
  if (!code) {
    throw new Error('缺少 js_code')
  }

  const url =
    `https://api.weixin.qq.com/sns/jscode2session` +
    `?appid=${encodeURIComponent(config.wx.appId)}` +
    `&secret=${encodeURIComponent(config.wx.secret)}` +
    `&js_code=${encodeURIComponent(code)}` +
    `&grant_type=authorization_code`

  const data = await fetchJson(url)
  if (data.errcode) {
    const err = new Error(mapWxAuthError(data.errcode, data.errmsg))
    err.code = data.errcode
    err.statusCode = 400
    throw err
  }
  if (!data.openid) {
    throw new Error('微信未返回 openid')
  }
  return data
}

/**
 * 用 phoneCode 换手机号（新版 getPhoneNumber）
 * @see https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-info/phone-number/getPhoneNumber.html
 */
async function getPhoneNumber(phoneCode) {
  if (!phoneCode) {
    throw new Error('缺少 phoneCode')
  }

  const tryOnce = async (forceRefresh) => {
    const accessToken = await getAccessToken(forceRefresh)
    const url =
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber` +
      `?access_token=${encodeURIComponent(accessToken)}`
    return fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: phoneCode })
    })
  }

  let data = await tryOnce(false)
  // access_token 无效时刷新再试一次
  if (data.errcode === 40001 || data.errcode === 42001) {
    data = await tryOnce(true)
  }

  if (data.errcode) {
    const err = new Error(mapWxPhoneError(data.errcode, data.errmsg))
    err.code = data.errcode
    throw err
  }

  const info = data.phone_info || {}
  const phone = info.purePhoneNumber || info.phoneNumber || ''
  if (!phone) {
    throw new Error('未获取到手机号')
  }
  return {
    phoneNumber: info.phoneNumber || phone,
    purePhoneNumber: info.purePhoneNumber || phone,
    countryCode: info.countryCode || '86'
  }
}

function mapWxAuthError(code, errmsg) {
  const map = {
    40029: '登录凭证无效，请重试',
    40163: '登录凭证已使用，请重试',
    45011: '操作过于频繁，请稍后再试',
    40226: '高风险用户，登录被拦截',
    40013: 'AppID 无效，请检查配置',
    40125: 'AppSecret 无效，请检查配置'
  }
  return map[code] || errmsg || `微信登录失败(${code})`
}

function mapWxPhoneError(code, errmsg) {
  const map = {
    40029: '手机号授权已失效，请重新点击登录',
    40163: '手机号授权已失效，请重新点击登录',
    40001: '微信凭证失效，请重试',
    42001: '微信凭证过期，请重试'
  }
  return map[code] || errmsg || `获取手机号失败(${code})`
}

function mapWxacodeError(code, errmsg) {
  const map = {
    41030: '小程序码页面不存在或未发布',
    40001: '微信凭证失效，请重试',
    40129: 'scene 非法',
    45009: '生成次数过多，请稍后再试'
  }
  return map[code] || errmsg || `生成小程序码失败(${code})`
}

/**
 * 官方无限小程序码（扫码才能进小程序，不能自己画 path）
 * @see https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html
 */
async function getWxaCodeUnlimited({ scene, page }) {
  if (!config.wx.appId || !config.wx.secret) {
    const err = new Error('未配置 WX_APPID / WX_SECRET')
    err.statusCode = 400
    throw err
  }
  if (!scene || String(scene).length > 32) {
    const err = new Error('scene 非法')
    err.statusCode = 400
    throw err
  }

  const tryOnce = async (forceRefresh) => {
    const accessToken = await getAccessToken(forceRefresh)
    const url =
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: String(scene),
        page,
        // ponytail: page 在分包，未全量发布时 check_path 会 41030；正式版稳定后可改 true
        check_path: false,
        env_version: config.wx.wxaEnv || 'release',
        width: 430
      })
    })
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf[0] === 0x7b) {
      let data = {}
      try {
        data = JSON.parse(buf.toString('utf8'))
      } catch (e) {}
      return { error: data }
    }
    return { buffer: buf }
  }

  let result = await tryOnce(false)
  if (result.error && (result.error.errcode === 40001 || result.error.errcode === 42001)) {
    result = await tryOnce(true)
  }
  if (result.error) {
    const err = new Error(mapWxacodeError(result.error.errcode, result.error.errmsg))
    err.code = result.error.errcode
    err.statusCode = 400
    throw err
  }
  return result
}

function wxaMiniprogramState() {
  const env = config.wx.wxaEnv || 'release'
  if (env === 'trial') return 'trial'
  if (env === 'develop') return 'developer'
  return 'formal'
}

function clipWx(s, n) {
  const t = String(s || '').trim()
  if (t.length <= n) return t || ' '
  return `${t.slice(0, n - 1)}…`
}

/**
 * 小程序订阅消息（一次性）。用户未授权时微信返回 43101，调用方忽略即可。
 * @see https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html
 */
async function sendSubscribeMessage({ openid, templateId, page, data }) {
  if (!templateId || !openid) return { skipped: true }
  const tryOnce = async (forceRefresh) => {
    const accessToken = await getAccessToken(forceRefresh)
    const url =
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(accessToken)}`
    return fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: openid,
        template_id: templateId,
        page: page || '',
        miniprogram_state: wxaMiniprogramState(),
        lang: 'zh_CN',
        data: data || {}
      })
    })
  }
  let result = await tryOnce(false)
  if (result.errcode === 40001 || result.errcode === 42001) {
    result = await tryOnce(true)
  }
  return result
}

module.exports = {
  code2Session,
  getPhoneNumber,
  getAccessToken,
  getWxaCodeUnlimited,
  sendSubscribeMessage,
  clipWx
}

if (require.main === module) {
  const assert = require('assert')
  assert.equal(clipWx('ab', 5), 'ab')
  assert.equal(clipWx('abcdefghij', 5).length, 5)
  console.log('ok')
}
