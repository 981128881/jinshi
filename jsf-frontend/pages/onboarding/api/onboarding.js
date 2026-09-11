import { get, post } from '../../../utils/request.js'

export function fetchMyApplication(options = {}) {
	return get('/onboarding/mine', {}, { auth: true, ...options })
}

export function saveOnboardingDraft(data, options = {}) {
	return post('/onboarding/draft', data, { auth: true, loading: true, ...options })
}

export function submitOnboarding(data, options = {}) {
	return post('/onboarding/submit', data, { auth: true, loading: true, ...options })
}
