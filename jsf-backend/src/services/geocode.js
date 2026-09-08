const config = require('../config')
const { getOrSet, CACHE_KEYS } = require('../db/redis')

const DEFAULT_REGION = {
	province: '辽宁省',
	city: '沈阳市',
	district: '铁西区'
}

async function reverseGeocodeByTencent(latitude, longitude) {
	const key = config.map?.tencentKey
	if (!key) return null

	const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=${key}`
	const res = await fetch(url)
	const body = await res.json()
	if (body.status !== 0 || !body.result?.address_component) return null

	const comp = body.result.address_component
	return {
		province: comp.province || '',
		city: comp.city || '',
		district: comp.district || ''
	}
}

function roundCoord(v) {
	// 约 100m 粒度，降低缓存碎片
	return Number(Number(v).toFixed(3))
}

async function resolveRegion(latitude, longitude) {
	if (latitude == null || longitude == null) {
		return { ...DEFAULT_REGION }
	}

	const lat = roundCoord(latitude)
	const lng = roundCoord(longitude)
	if (Number.isNaN(lat) || Number.isNaN(lng)) {
		return { ...DEFAULT_REGION }
	}

	try {
		const region = await getOrSet(CACHE_KEYS.geocode(lat, lng), 86400, async () => {
			const data = await reverseGeocodeByTencent(lat, lng)
			if (data?.province && data?.city && data?.district) return data
			return { ...DEFAULT_REGION }
		})
		if (region?.province && region?.city) return region
	} catch (e) {}

	return { ...DEFAULT_REGION }
}

module.exports = { resolveRegion, DEFAULT_REGION }
