import { get, post, put, del } from '@/api/request'
import { uploadFile } from '@/api/request/file.js'

/** @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchBanners = (options) => get('/admin/banners', options)

/** @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createBanner = (data, options) => post('/admin/banners', data, { loading: true, ...options })

/** @param {string|number} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateBanner = (id, data, options) => put(`/admin/banners/${id}`, data, { loading: true, ...options })

/** @param {string|number} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const deleteBanner = (id, options) => del(`/admin/banners/${id}`, { loading: true, ...options })

export const uploadBannerImage = (file, options) =>
  uploadFile('/admin/upload', file, 'file', { type: 'banner' }, { loading: true, ...options })
