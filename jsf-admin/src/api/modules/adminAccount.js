import { get, post, put, del } from '@/api/request'

export function fetchAdminProfile(options) {
  return get('/admin/me', options)
}

export function fetchPermissionTree(options) {
  return get('/admin/permissions/tree', options)
}

export function fetchAdminUsers(options) {
  return get('/admin/admins', options)
}

export function createAdminUser(data, options) {
  return post('/admin/admins', data, options)
}

export function updateAdminUser(id, data, options) {
  return put(`/admin/admins/${id}`, data, options)
}

export function deleteAdminUser(id, options) {
  return del(`/admin/admins/${id}`, options)
}
