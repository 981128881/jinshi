import { get, post, put, del } from '@/api/request'
import { uploadFile, downloadFile } from '@/api/request/file.js'

/** @param {Record<string, *>} [params] @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchProducts = (params, options) => get('/admin/products', { params, ...options })

/** @param {string|number} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchProduct = (id, options) => get(`/admin/products/${id}`, options)

/** @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createProduct = (data, options) => post('/admin/products', data, { loading: true, ...options })

/** @param {string|number} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateProduct = (id, data, options) => put(`/admin/products/${id}`, data, { loading: true, ...options })

/** @param {string|number} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const deleteProduct = (id, options) => del(`/admin/products/${id}`, { loading: true, ...options })

/** @param {number[]} ids @param {import('@/api/request/types.js').RequestOptions} [options] */
export const batchDeleteProducts = (ids, options) =>
  post('/admin/products/batch-delete', { ids }, { loading: true, ...options })

/** @param {number[]} ids @param {number} categoryId @param {import('@/api/request/types.js').RequestOptions} [options] */
export const batchUpdateProductCategory = (ids, categoryId, options) =>
  put('/admin/products/batch-category', { ids, categoryId }, { loading: true, ...options })

/** @param {File|Blob} file @param {import('@/api/request/types.js').RequestOptions} [options] */
export const uploadProductImage = (file, options) =>
  uploadFile('/admin/upload', file, 'file', { type: 'product' }, { loading: true, ...options })

/** @param {Record<string, *>} [params] @param {import('@/api/request/types.js').RequestOptions} [options] */
export const exportProducts = (params, options) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = params?.ids ? `products-selected-${date}.xlsx` : `products-all-${date}.xlsx`
  return downloadFile('/admin/products/export', filename, {
    params,
    loading: true,
    loadingText: '正在导出，请稍候…',
    ...options
  })
}
