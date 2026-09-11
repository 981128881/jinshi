const config = require('../config')

// 微信 <image> 不支持 svg；种子图已落成同名 png
function toWechatImagePath(p) {
  return String(p).replace(/(\/static\/(?:shop|dish)\/[^/?#]+)\.svg$/i, '$1.png')
}

function resolvePublicUrl(pathOrUrl) {
  if (!pathOrUrl) return ''
  const path = toWechatImagePath(pathOrUrl)
  if (/^https?:\/\//i.test(path)) return path
  const base = (config.publicBaseUrl || '').replace(/\/$/, '')
  if (!base) return path
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

function toStoredPath(pathOrUrl) {
  if (!pathOrUrl) return ''
  const base = (config.publicBaseUrl || '').replace(/\/$/, '')
  if (base && pathOrUrl.startsWith(base)) {
    return pathOrUrl.slice(base.length) || '/'
  }
  return pathOrUrl
}

module.exports = { resolvePublicUrl, toStoredPath, toWechatImagePath }

if (require.main === module) {
  const got = toWechatImagePath('/static/shop/shop-2.svg')
  if (got !== '/static/shop/shop-2.png') {
    console.error('toWechatImagePath failed', got)
    process.exit(1)
  }
  console.log('ok')
}
