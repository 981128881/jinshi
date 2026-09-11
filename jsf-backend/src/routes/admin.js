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
  refreshAdminTokens,
  revokeAdminRefreshToken,
  getAdminProfile
} = require('../services/adminAuth')
const { authenticateAdmin, listAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } = require('../services/adminUser')
const { adminRequired } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { getPermissionTreeForUser } = require('../constants/adminPermissions')
const upload = require('../middleware/upload')
const { compressProductImage } = require('../utils/imageCompress')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { buildDashboardData } = require('../services/dashboardService')
const { createLogger } = require('../utils/logger')
const { isBlocked, recordFail, recordOk, clientIp } = require('../utils/loginLimit')
const { pageTake, pageSkip } = require('../utils/pager')
const { assertImageFile } = require('../utils/imageMagic')

const log = createLogger('dashboard')
const logAuth = createLogger('auth')

const router = express.Router()

router.post('/login', async (req, res, next) => {
  try {
    const username = String((req.body || {}).username || '').trim()
    const password = String((req.body || {}).password || '')
    const ip = clientIp(req)
    if (isBlocked(ip, username)) {
      logAuth.warn('登录锁定', { username, ip })
      return fail(res, 429, '尝试过多，请 15 分钟后再试', 429)
    }
    const user = await authenticateAdmin(username, password)
    if (user) {
      recordOk(ip, username)
      logAuth.info('登录成功', { username, ip, restaurantId: user.restaurantId || null })
      const tokens = await issueAdminTokens(user)
      return success(res, tokens)
    }
    recordFail(ip, username)
    logAuth.warn('登录失败', { username, ip })
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

router.get('/ws', (_req, res) => {
  res.status(426).end('WebSocket')
})

router.use(adminRequired)

router.get('/me', async (req, res) => {
  const profile = await getAdminProfile(req.admin.username)
  if (!profile) return fail(res, 401, '账号不可用', 401)
  return success(res, profile)
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
    const row = await createAdminUser(req.body || {}, req.admin)
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
    const payload = await buildDashboardData(prisma, {
      restaurantId: req.admin.restaurantId || null
    })
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
    if (req.admin.restaurantId && type === 'banner') {
      return fail(res, 403, '无权上传轮播图', 403)
    }
    assertImageFile(req.file.path)
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
    const take = pageTake(pageSize)
    const skip = pageSkip(page, take)
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
