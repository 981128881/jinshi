const express = require('express')
const prisma = require('../db/prisma')
const {
  getShopConfig,
  updateShopConfig,
  invalidateBanners
} = require('../services/shop')
const { success, fail } = require('../utils/response')
const {
  issueAdminTokens,
  issueMerchantAdminTokens,
  authenticateMerchantAdmin,
  refreshAdminTokens,
  revokeAdminRefreshToken,
  getAdminProfile,
  getMerchantAdminProfile
} = require('../services/adminAuth')
const { authenticateAdmin, listAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } = require('../services/adminUser')
const { adminRequired } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { getPermissionTreeForUser, isOrgAdmin } = require('../constants/adminPermissions')
const upload = require('../middleware/upload')
const { compressProductImage } = require('../utils/imageCompress')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { buildDashboardData } = require('../services/dashboardService')
const { createLogger } = require('../utils/logger')

const log = createLogger('dashboard')

const router = express.Router()

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    // 1) 平台管理员
    const user = await authenticateAdmin(username, password)
    if (user) {
      const tokens = await issueAdminTokens(user)
      return success(res, tokens)
    }
    // 2) 门店店主（手机号账号，组织权限）
    const merchant = await authenticateMerchantAdmin(username, password)
    if (merchant) {
      const tokens = await issueMerchantAdminTokens(merchant, merchant.restaurant)
      return success(res, tokens)
    }
    return fail(res, 401, '用户名或密码错误', 401)
  } catch (e) {
    next(e)
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {}
    if (!refreshToken) return fail(res, 400, '缺少 refreshToken')
    const tokens = await refreshAdminTokens(refreshToken)
    return success(res, tokens)
  } catch (e) {
    return fail(res, 401, '登录已过期，请重新登录', 401)
  }
})

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {}
  if (refreshToken) await revokeAdminRefreshToken(refreshToken)
  return success(res, null)
})

router.use(adminRequired)

router.get('/me', async (req, res) => {
  if (isOrgAdmin(req.admin)) {
    const profile = await getMerchantAdminProfile(req.admin.id)
    if (!profile) return fail(res, 401, '账号不可用', 401)
    return success(res, profile)
  }
  const profile = await getAdminProfile(req.admin.username)
  if (!profile) return fail(res, 401, '账号不可用', 401)
  return success(res, {
    ...profile,
    orgType: 'platform',
    restaurantId: null,
    restaurantName: null
  })
})

router.get('/permissions/tree', (req, res) => {
  return success(res, getPermissionTreeForUser(req.admin))
})

router.get('/admins', requirePermission('menu:system'), async (req, res, next) => {
  try {
    return success(res, { list: await listAdminUsers() })
  } catch (e) {
    next(e)
  }
})

router.post('/admins', requirePermission('admin:create'), async (req, res, next) => {
  try {
    const row = await createAdminUser(req.body || {})
    return success(res, row)
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

router.put('/admins/:id', requirePermission('admin:edit', 'admin:permission'), async (req, res, next) => {
  try {
    const row = await updateAdminUser(Number(req.params.id), req.body || {}, req.admin)
    return success(res, row)
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

router.delete('/admins/:id', requirePermission('admin:delete'), async (req, res, next) => {
  try {
    const result = await deleteAdminUser(Number(req.params.id), req.admin)
    return success(res, result)
  } catch (e) {
    if (e.statusCode) return fail(res, e.statusCode, e.message, e.statusCode)
    next(e)
  }
})

router.get('/dashboard', async (req, res, next) => {
  try {
    const restaurantId = isOrgAdmin(req.admin) ? req.admin.restaurantId : null
    const payload = await buildDashboardData(prisma, { restaurantId })
    return success(res, payload)
  } catch (e) {
    log.error('dashboard 统计失败', e)
    next(e)
  }
})

// --- 轮播 ---
router.get('/banners', requirePermission('menu:banners'), async (req, res, next) => {
  try {
    const list = await prisma.banner.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] })
    return success(
      res,
      list.map((b) => ({
        ...b,
        imageUrl: resolvePublicUrl(b.imageUrl || '')
      }))
    )
  } catch (e) {
    next(e)
  }
})

router.post('/banners', requirePermission('banner:create'), async (req, res, next) => {
  try {
    const { imageUrl, title, link, sort, enabled } = req.body || {}
    if (!imageUrl) return fail(res, 400, '请填写图片地址')
    const row = await prisma.banner.create({
      data: {
        imageUrl,
        title: title || '',
        link: link || '',
        sort: Number(sort) || 0,
        enabled: enabled !== false
      }
    })
    await invalidateBanners()
    return success(res, { ...row, imageUrl: resolvePublicUrl(row.imageUrl || '') })
  } catch (e) {
    next(e)
  }
})

router.put('/banners/:id', requirePermission('banner:edit'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { imageUrl, title, link, sort, enabled } = req.body || {}
    const row = await prisma.banner.update({
      where: { id },
      data: {
        imageUrl,
        title: title || '',
        link: link || '',
        sort: sort != null ? Number(sort) : undefined,
        enabled: enabled != null ? !!enabled : undefined
      }
    })
    await invalidateBanners()
    return success(res, { ...row, imageUrl: resolvePublicUrl(row.imageUrl || '') })
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, '轮播不存在', 404)
    next(e)
  }
})

router.delete('/banners/:id', requirePermission('banner:delete'), async (req, res, next) => {
  try {
    await prisma.banner.delete({ where: { id: Number(req.params.id) } })
    await invalidateBanners()
    return success(res, { success: true })
  } catch (e) {
    if (e.code === 'P2025') return fail(res, 404, '轮播不存在', 404)
    next(e)
  }
})

// --- 平台配置 ---
router.get('/shop-config', requirePermission('menu:settings.platform'), async (req, res, next) => {
  try {
    return success(res, await getShopConfig())
  } catch (e) {
    next(e)
  }
})

router.put('/shop-config', requirePermission('settings.platform:edit'), async (req, res, next) => {
  try {
    const data = await updateShopConfig(req.body || {})
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

/** 兼容旧路径 */
router.get('/platform-config', requirePermission('menu:settings.platform'), async (req, res, next) => {
  try {
    return success(res, await getShopConfig())
  } catch (e) {
    next(e)
  }
})

router.put('/platform-config', requirePermission('settings.platform:edit'), async (req, res, next) => {
  try {
    const data = await updateShopConfig(req.body || {})
    return success(res, data)
  } catch (e) {
    next(e)
  }
})

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return fail(res, 400, err.message || '上传失败')
    next()
  })
}, async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 400, '请选择文件')
    const type = req.body?.type
    const folder =
      type === 'product' ? 'products' : type === 'banner' ? 'uploads/banners' : 'category'

    let filename = req.file.filename
    if (type === 'product') {
      const result = await compressProductImage(req.file.path)
      filename = result.filename
    }

    const storedPath = `/static/${folder}/${filename}`
    return success(res, {
      path: storedPath,
      url: resolvePublicUrl(storedPath)
    })
  } catch (e) {
    next(e)
  }
})

router.get('/users', requirePermission('menu:users'), async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query
    const take = Number(pageSize) || 10
    const skip = ((Number(page) || 1) - 1) * take
    const [list, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { id: 'desc' },
        skip,
        take,
        select: { id: true, nickname: true, phone: true, avatar: true, createdAt: true }
      }),
      prisma.user.count()
    ])
    return success(res, { list, total })
  } catch (e) {
    next(e)
  }
})

module.exports = router
