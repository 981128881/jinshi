import { get, post } from '@/api/request'

/** @param {Record<string,*>} [params] @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchReservations = (params = {}, options) =>
  get('/admin/reservations', { params, ...options })

/** @param {string} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchReservationDetail = (id, options) =>
  get(`/admin/reservations/${encodeURIComponent(String(id))}`, options)

/** @param {string} id @param {string} status @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateReservationStatus = (id, status, options) =>
  post(`/admin/reservations/${encodeURIComponent(String(id))}/status`, { status }, { loading: true, ...options })
