import { get } from '../utils/request.js'

export function fetchCuisineTypes(options = {}) {
	return get('/restaurants/cuisine-types', {}, { auth: false, showError: false, ...options })
}

/** 列表支持 sort=recommend|sales|distance，可带 lat/lng；有登录态时带 token 以识别「去过」 */
export function fetchRestaurants(params = {}, options = {}) {
	return get('/restaurants', params, { auth: true, silent401: true, showError: false, ...options })
}

export function fetchRestaurantDetail(id, options = {}) {
	return get(`/restaurants/${id}`, {}, { auth: false, ...options })
}

export function reverseGeocode(latitude, longitude, options = {}) {
	return get(
		'/config/reverse-geocode',
		{ latitude, longitude },
		{ auth: false, showError: false, ...options }
	)
}

export function fetchHomeBanners(options = {}) {
	return get('/home/banners', {}, { auth: false, showError: false, ...options })
}
