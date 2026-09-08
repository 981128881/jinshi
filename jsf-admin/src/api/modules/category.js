import { get, post, put, del, clearCache } from '@/api/request'
import { uploadFile } from '@/api/request/file.js'

/** @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchCategories = (options) =>
  get('/admin/categories', { dedup: 'categories', cache: true, ...options })

/** @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createCategory = async (data, options) => {
  const result = await post('/admin/categories', data, { loading: true, ...options })
  clearCache('categories')
  return result
}

/** @param {string|number} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateCategory = async (id, data, options) => {
  const result = await put(`/admin/categories/${id}`, data, { loading: true, ...options })
  clearCache('categories')
  return result
}

/** @param {string|number} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const deleteCategory = async (id, options) => {
  const result = await del(`/admin/categories/${id}`, { loading: true, ...options })
  clearCache('categories')
  return result
}

/** @param {File|Blob} file @param {import('@/api/request/types.js').RequestOptions} [options] */
export const uploadCategoryIcon = (file, options) =>
  uploadFile('/admin/upload', file, 'file', { type: 'category' }, { loading: true, ...options })
