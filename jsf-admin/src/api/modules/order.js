import { get, put, post } from '@/api/request'

/** @param {Record<string, *>} [params] @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchOrders = (params, options) => get('/admin/orders', { params, ...options })

/** @param {string|number} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchOrderDetail = (id, options) => get(`/admin/orders/${id}`, { ...options })

/** @param {string|number} id @param {string} status @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateOrderStatus = (id, status, options) =>
  put(`/admin/orders/${id}/status`, { status }, { loading: true, ...options })

/** @param {string|number} id @param {string} reason @param {import('@/api/request/types.js').RequestOptions} [options] */
export const refundOrder = (id, reason, options) =>
  post(`/admin/orders/${id}/refund`, { reason }, { loading: true, ...options })

/** @param {string|number} refundId @param {import('@/api/request/types.js').RequestOptions} [options] */
export const retryRefund = (refundId, options) =>
  post(`/admin/refunds/${refundId}/retry`, {}, { loading: true, ...options })
