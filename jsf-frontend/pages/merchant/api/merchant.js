import { get, post, put } from '../../../utils/request.js'

export function fetchMyMerchantRestaurants(options = {}) {
	return get('/merchant/restaurants', {}, { auth: true, ...options })
}

export function setRestaurantOpen(restaurantId, open, options = {}) {
	return post(`/merchant/restaurants/${restaurantId}/open`, { open }, { auth: true, loading: true, ...options })
}

export function fetchMerchantCategories(restaurantId, options = {}) {
	return get(`/merchant/restaurants/${restaurantId}/categories`, {}, { auth: true, ...options })
}

export function createMerchantCategory(restaurantId, data, options = {}) {
	return post(`/merchant/restaurants/${restaurantId}/categories`, data, { auth: true, loading: true, ...options })
}

export function fetchMerchantDishes(restaurantId, options = {}) {
	return get(`/merchant/restaurants/${restaurantId}/dishes`, {}, { auth: true, ...options })
}

export function createMerchantDish(restaurantId, data, options = {}) {
	return post(`/merchant/restaurants/${restaurantId}/dishes`, data, { auth: true, loading: true, ...options })
}

export function updateMerchantDish(restaurantId, dishId, data, options = {}) {
	return put(`/merchant/restaurants/${restaurantId}/dishes/${dishId}`, data, { auth: true, loading: true, ...options })
}

export function fetchMerchantOrders(restaurantId, params = {}, options = {}) {
	return get(`/merchant/restaurants/${restaurantId}/orders`, params, { auth: true, ...options })
}

export function fetchMerchantOrder(restaurantId, orderId, options = {}) {
	return get(`/merchant/restaurants/${restaurantId}/orders/${orderId}`, {}, { auth: true, ...options })
}

export function updateMerchantOrderStatus(restaurantId, orderId, status, options = {}) {
	return post(
		`/merchant/restaurants/${restaurantId}/orders/${orderId}/status`,
		{ status },
		{ auth: true, loading: true, ...options }
	)
}

export function fetchRestaurantWxaCode(restaurantId, options = {}) {
	return get(`/merchant/restaurants/${restaurantId}/wxacode`, {}, { auth: true, loading: true, ...options })
}
