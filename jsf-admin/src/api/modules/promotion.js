import { get, post, put, del } from '@/api/request'

/** @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchPromotions = (options) => get('/admin/promotions', options)

/** @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createPromotion = (data, options) => post('/admin/promotions', data, { loading: true, ...options })

/** @param {string|number} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updatePromotion = (id, data, options) => put(`/admin/promotions/${id}`, data, { loading: true, ...options })

/** @param {string|number} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const deletePromotion = (id, options) => del(`/admin/promotions/${id}`, { loading: true, ...options })
