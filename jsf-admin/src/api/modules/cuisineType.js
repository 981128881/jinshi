import { get, post, put, del } from '@/api/request'

/** @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchCuisineTypes = (options) => get('/admin/cuisine-types', options)

/** @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createCuisineType = (data, options) =>
  post('/admin/cuisine-types', data, { loading: true, ...options })

/** @param {number|string} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateCuisineType = (id, data, options) =>
  put(`/admin/cuisine-types/${id}`, data, { loading: true, ...options })

/** @param {number|string} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const deleteCuisineType = (id, options) =>
  del(`/admin/cuisine-types/${id}`, { loading: true, ...options })
