import { get, post } from '../../../utils/request.js'

export function createReservation(data, options = {}) {
	return post('/reservations', data, { auth: true, loading: true, ...options })
}

export function fetchMyReservations(params = {}, options = {}) {
	const query = {}
	if (params.status) query.status = params.status
	return get('/reservations/mine', query, { auth: true, ...options })
}

export function fetchReservationDetail(id, options = {}) {
	return get(`/reservations/${id}`, {}, { auth: true, ...options })
}

export function cancelReservation(id, options = {}) {
	return post(`/reservations/${id}/cancel`, {}, { auth: true, loading: true, ...options })
}
