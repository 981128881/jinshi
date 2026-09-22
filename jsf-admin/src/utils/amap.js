const KEY = import.meta.env.VITE_AMAP_KEY || ''
const SECURITY = import.meta.env.VITE_AMAP_SECURITY_CODE || ''

let loading = null

export function getAmapKey() {
  return KEY
}

export function loadAmap() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.AMap) return Promise.resolve(window.AMap)
  if (!KEY) return Promise.reject(new Error('未配置 VITE_AMAP_KEY'))

  if (!loading) {
    loading = new Promise((resolve, reject) => {
      if (SECURITY) {
        window._AMapSecurityConfig = { securityJsCode: SECURITY }
      }
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(KEY)}&plugin=AMap.PlaceSearch,AMap.Geocoder`
      script.async = true
      script.onload = () => {
        if (window.AMap) resolve(window.AMap)
        else reject(new Error('高德地图加载失败'))
      }
      script.onerror = () => reject(new Error('高德地图脚本加载失败'))
      document.head.appendChild(script)
    })
  }
  return loading
}
