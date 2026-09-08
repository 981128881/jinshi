const { sceneFromRestaurantId, restaurantIdFromQuery, WXA_PAGE } = require('../src/utils/restaurantScene')

const decodeCases = [
  [{ id: '12' }, 12],
  [{ scene: '12' }, 12],
  [{ scene: 'id=12' }, 12],
  [{ scene: encodeURIComponent('12') }, 12],
  [{ scene: '0' }, 0],
  [{ scene: 'abc' }, 0],
  [{}, 0]
]

for (const [query, expected] of decodeCases) {
  const got = restaurantIdFromQuery(query)
  if (got !== expected) {
    throw new Error(`restaurantIdFromQuery(${JSON.stringify(query)}) => ${got}, want ${expected}`)
  }
}

if (sceneFromRestaurantId(12) !== '12') throw new Error('scene encode')
if (WXA_PAGE !== 'pages/restaurant/detail') throw new Error('wxa page')
try {
  sceneFromRestaurantId(0)
  throw new Error('scene 0 should throw')
} catch (e) {
  if (e.message === 'scene 0 should throw') throw e
}

console.log('restaurant scene self-check passed')
