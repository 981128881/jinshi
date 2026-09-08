import { get } from '@/api/request'

/** @param {Record<string, *>} [params] @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchUsers = (params, options) => get('/admin/users', { params, ...options })
