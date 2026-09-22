/** 微信 <image> 不支持 svg；种子图在包内 /static/shop|dish/*.png */
export function rewriteWechatImageUrl(s) {
	if (typeof s !== 'string') return s
	return s
		.replace(/^https?:\/\/[^/]+(\/static\/(?:shop|dish)\/)/i, '$1')
		.replace(/(\/static\/(?:shop|dish)\/[^/?#]+)\.svg/gi, '$1.png')
}

export function rewriteWechatImages(v) {
	if (typeof v === 'string') return rewriteWechatImageUrl(v)
	if (Array.isArray(v)) {
		for (let i = 0; i < v.length; i++) v[i] = rewriteWechatImages(v[i])
		return v
	}
	if (v && typeof v === 'object') {
		for (const k of Object.keys(v)) v[k] = rewriteWechatImages(v[k])
	}
	return v
}
