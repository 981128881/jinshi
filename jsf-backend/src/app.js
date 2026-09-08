const express = require('express')
const path = require('path')
const cors = require('cors')
const prisma = require('./db/prisma')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const { requestTimeout } = require('./middleware/requestTimeout')
const { httpLogger } = require('./middleware/httpLogger')
const { createLogger } = require('./utils/logger')

const log = createLogger('app')

const authRoutes = require('./routes/auth')
const homeRoutes = require('./routes/home')
const configRoutes = require('./routes/config')
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const logsRoutes = require('./routes/clientLogs')
const onboardingRoutes = require('./routes/onboarding')
const restaurantsRoutes = require('./routes/restaurants')
const reservationsRoutes = require('./routes/reservations')
const merchantRoutes = require('./routes/merchant')
const adminOnboardingRoutes = require('./routes/adminOnboarding')
const merchantAppRoutes = require('./routes/merchantApp')
const adminRestaurantsRoutes = require('./routes/adminRestaurants')
const adminCuisineTypesRoutes = require('./routes/adminCuisineTypes')
const adminReservationsRoutes = require('./routes/adminReservations')

const app = express()

// 小程序请求对 304/ETag 支持差，API 一律返回完整 200
app.set('etag', false)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.use(cors())
app.use(httpLogger)

app.use('/static/category', express.static(path.join(__dirname, '../public/category')))
app.use('/static/products', express.static(path.join(__dirname, '../public/products')))
app.use('/static/uploads', express.static(path.join(__dirname, '../public/uploads')))

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  } catch (e) {
    log.error('health check database failed', e)
    res.status(503).json({ ok: false, error: 'database_unavailable' })
  }
})

app.use(express.json())
app.use('/api/logs', logsRoutes)
app.use(requestTimeout())

const api = express.Router()
api.use('/auth', authRoutes)
api.use('/home', homeRoutes)
api.use('/config', configRoutes)
api.use('/user', userRoutes)
api.use('/onboarding', onboardingRoutes)
api.use('/restaurants', restaurantsRoutes)
api.use('/reservations', reservationsRoutes)
api.use('/merchant', merchantRoutes)
api.use('/merchant-app', merchantAppRoutes)
api.use('/admin/onboarding', adminOnboardingRoutes)
api.use('/admin/restaurants', adminRestaurantsRoutes)
api.use('/admin/cuisine-types', adminCuisineTypesRoutes)
api.use('/admin/reservations', adminReservationsRoutes)
api.use('/admin', adminRoutes)
// 一期已下线：支付 / 地址配送 / POS 同步 / 商超商品主数据路由

app.use('/api', api)
app.use(notFound)
app.use(errorHandler)

module.exports = app
