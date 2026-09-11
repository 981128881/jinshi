import { get, post, put, del } from '@/api/request'

/** @param {Record<string,*>} [params] @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchRestaurants = (params = {}, options) =>
  get('/admin/restaurants', { params, ...options })

/** @param {number|string} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchRestaurant = (id, options) => get(`/admin/restaurants/${id}`, options)

/** @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createRestaurant = (data, options) =>
  post('/admin/restaurants', data, { loading: true, ...options })

/** @param {number|string} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateRestaurant = (id, data, options) =>
  put(`/admin/restaurants/${id}`, data, { loading: true, ...options })

/** @param {number|string} id @param {boolean} open @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateRestaurantOpen = (id, open, options) =>
  put(`/admin/restaurants/${id}/open`, { open }, { loading: true, ...options })

/** @param {number|string} id @param {string} status @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateRestaurantStatus = (id, status, options) =>
  put(`/admin/restaurants/${id}/status`, { status }, { loading: true, ...options })

/** @param {number|string} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchRestaurantCategories = (id, options) =>
  get(`/admin/restaurants/${id}/categories`, options)

/** @param {number|string} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createRestaurantCategory = (id, data, options) =>
  post(`/admin/restaurants/${id}/categories`, data, { loading: true, ...options })

/** @param {number|string} id @param {number|string} categoryId @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateRestaurantCategory = (id, categoryId, data, options) =>
  put(`/admin/restaurants/${id}/categories/${categoryId}`, data, { loading: true, ...options })

/** @param {number|string} id @param {number|string} categoryId @param {import('@/api/request/types.js').RequestOptions} [options] */
export const deleteRestaurantCategory = (id, categoryId, options) =>
  del(`/admin/restaurants/${id}/categories/${categoryId}`, { loading: true, ...options })

/** @param {number|string} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchRestaurantDishes = (id, options) =>
  get(`/admin/restaurants/${id}/dishes`, options)

/** @param {number|string} id @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const createRestaurantDish = (id, data, options) =>
  post(`/admin/restaurants/${id}/dishes`, data, { loading: true, ...options })

/** @param {number|string} id @param {number|string} dishId @param {*} data @param {import('@/api/request/types.js').RequestOptions} [options] */
export const updateRestaurantDish = (id, dishId, data, options) =>
  put(`/admin/restaurants/${id}/dishes/${dishId}`, data, { loading: true, ...options })

/** @param {number|string} id @param {number|string} dishId @param {import('@/api/request/types.js').RequestOptions} [options] */
export const deleteRestaurantDish = (id, dishId, options) =>
  del(`/admin/restaurants/${id}/dishes/${dishId}`, { loading: true, ...options })

/** @param {number|string} id @param {import('@/api/request/types.js').RequestOptions} [options] */
export const fetchRestaurantWxaCode = (id, options) =>
  get(`/admin/restaurants/${id}/wxacode`, { loading: true, ...options })
