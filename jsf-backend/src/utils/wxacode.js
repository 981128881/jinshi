const fs = require('fs')
const path = require('path')
const config = require('../config')
const { resolvePublicUrl } = require('./publicUrl')
const { getWxaCodeUnlimited } = require('./wx')
const { WXA_PAGE, sceneFromRestaurantId } = require('./restaurantScene')

async function ensureRestaurantWxaCode(restaurantId) {
  const env = config.wx.wxaEnv || 'release'
  const filename = `${restaurantId}-${env}.png`
  const rel = `/static/uploads/wxacode/${filename}`
  const abs = path.join(__dirname, '../../public/uploads/wxacode', filename)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  if (!fs.existsSync(abs) || fs.statSync(abs).size < 100) {
    const { buffer } = await getWxaCodeUnlimited({
      scene: sceneFromRestaurantId(restaurantId),
      page: WXA_PAGE
    })
    fs.writeFileSync(abs, buffer)
  }
  return { imageUrl: resolvePublicUrl(rel) }
}

module.exports = { ensureRestaurantWxaCode }
