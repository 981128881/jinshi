const WXA_PAGE = 'pages/restaurant/detail'

function sceneFromRestaurantId(id) {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) throw new Error('无效餐厅 ID')
  const scene = String(Math.trunc(n))
  if (scene.length > 32) throw new Error('scene 超长')
  return scene
}

function restaurantIdFromQuery(query = {}) {
  const raw = query.id || query.scene
  if (raw == null || raw === '') return 0
  let s = String(raw)
  try {
    s = decodeURIComponent(s)
  } catch (e) {}
  const n = Number(/^id=/i.test(s) ? s.slice(3) : s)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0
}

module.exports = { WXA_PAGE, sceneFromRestaurantId, restaurantIdFromQuery }
