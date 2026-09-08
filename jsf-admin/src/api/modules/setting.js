import { get, put, clearCache } from '@/api/request'

/** @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchShopConfig = (options) =>
  get('/admin/shop-config', { dedup: 'shop-config', cache: true, ...options })

/** @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateShopConfig = async (data, options) => {
  const result = await put('/admin/shop-config', data, { loading: true, ...options })
  clearCache('shop-config')
  return result
}

/** @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchHotKeywords = (options) => get('/admin/hot-keywords', options)

/** @param {string[]} keywords @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateHotKeywords = (keywords, options) =>
  put('/admin/hot-keywords', { keywords }, { loading: true, ...options })
