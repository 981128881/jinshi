import { get } from '../../../utils/request.js'

export function fetchShopConfig(options = {}) {
	return get('/config/shop', {}, { showError: false, ...options })
}
