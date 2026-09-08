const config = require('../config')

function resolvePublicUrl(pathOrUrl) {
  if (!pathOrUrl) return ''
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = (config.publicBaseUrl || '').replace(/\/$/, '')
  if (!base) return pathOrUrl
  return pathOrUrl.startsWith('/') ? `${base}${pathOrUrl}` : `${base}/${pathOrUrl}`
}

function toStoredPath(pathOrUrl) {
  if (!pathOrUrl) return ''
  const base = (config.publicBaseUrl || '').replace(/\/$/, '')
  if (base && pathOrUrl.startsWith(base)) {
    return pathOrUrl.slice(base.length) || '/'
  }
  return pathOrUrl
}

module.exports = { resolvePublicUrl, toStoredPath }
