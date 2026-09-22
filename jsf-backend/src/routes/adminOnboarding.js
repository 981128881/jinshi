const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { adminRequired } = require('../middleware/adminAuth')
const { requirePermission } = require('../middleware/adminPermission')
const { resolvePublicUrl } = require('../utils/publicUrl')
const { allocRestaurantCode } = require('../utils/restaurantCode')
const { hashPassword } = require('../utils/password')

const router = express.Router()

function mapApp(row) {
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    legalPerson: row.legalPerson,
    licenseNo: row.licenseNo,
    licenseImage: resolvePublicUrl(row.licenseImage || ''),
    restaurantName: row.restaurantName,
    cuisineTypeId: row.cuisineTypeId,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    doorImage: resolvePublicUrl(row.doorImage || ''),
    insideImage: resolvePublicUrl(row.insideImage || ''),
    rejectReason: row.rejectReason || '',
    restaurantId: row.restaurantId,
    restaurantCode: row.restaurant?.code || '',
    userId: row.userId,
    userNickname: row.user?.nickname || '',
    userPhone: row.user?.phone || '',
    submittedAt: row.submittedAt,
    auditedAt: row.auditedAt,
    createdAt: row.createdAt,
    auditLogs: (row.auditLogs || []).map((l) => ({
      id: l.id,
      action: l.action,
      remark: l.remark,
      adminName: l.adminName,
      createdAt: l.createdAt
    }))
  }
}

/** 门店后台账号：用户名=手机号，默认密码=手机号 */
async function ensureMerchantAdmin(tx, { phone, restaurantId, shopName }) {
  const username = String(phone || '').trim()
  if (!/^1\d{10}$/.test(username)) return null
  const password = hashPassword(username)
  const existing = await tx.adminUser.findUnique({ where: { username } })
  if (existing) {
    return tx.adminUser.update({
      where: { id: existing.id },
      data: {
        password,
        nickname: shopName || existing.nickname || username,
        enabled: true,
        isSuper: false,
        restaurantId
      }
    })
  }
  return tx.adminUser.create({
    data: {
      username,
      password,
      nickname: shopName || username,
      enabled: true,
      isSuper: false,
      permissions: [],
      restaurantId
    }
  })
}

router.get('/', adminRequired, requirePermission('menu:onboarding'), async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query
    const where = {}
    if (status) where.status = String(status)
    const take = Math.min(100, Number(pageSize) || 20)
    const skip = (Math.max(1, Number(page) || 1) - 1) * take
    const [total, list] = await Promise.all([
      prisma.onboardingApplication.count({ where }),
      prisma.onboardingApplication.findMany({
        where,
        include: { user: true, restaurant: true },
        orderBy: { id: 'desc' },
        skip,
        take
      })
    ])
    return success(res, { total, list: list.map(mapApp) })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', adminRequired, requirePermission('menu:onboarding'), async (req, res, next) => {
  try {
    const row = await prisma.onboardingApplication.findUnique({
      where: { id: Number(req.params.id) },
      include: { user: true, restaurant: true, auditLogs: { orderBy: { id: 'desc' } } }
    })
    if (!row) return fail(res, 404, '申请不存在', 404)
    return success(res, mapApp(row))
  } catch (e) {
    next(e)
  }
})

/** 通过：创建餐厅并绑定 owner */
router.post('/:id/approve', adminRequired, requirePermission('onboarding:review'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const app = await prisma.onboardingApplication.findUnique({ where: { id } })
    if (!app) return fail(res, 404, '申请不存在', 404)
    if (!['submitted', 'reviewing'].includes(app.status)) {
      return fail(res, 400, '当前状态不可审核通过')
    }

    const result = await prisma.$transaction(async (tx) => {
      let restaurantId = app.restaurantId
      if (!restaurantId) {
        const restaurant = await tx.restaurant.create({
          data: {
            code: await allocRestaurantCode(tx),
            name: (app.restaurantName || '').trim() || `${app.contactName}的店`,
            cuisineTypeId: app.cuisineTypeId,
            phone: app.contactPhone,
            address: app.address || '',
            latitude: app.latitude || 0,
            longitude: app.longitude || 0,
            coverImage: app.doorImage || '',
            logo: app.doorImage || '',
            licenseImage: app.licenseImage || '',
            description: '',
            status: 'approved',
            open: true
          }
        })
        restaurantId = restaurant.id
        await tx.restaurantMember.create({
          data: {
            restaurantId,
            userId: app.userId,
            role: 'owner'
          }
        })
      } else {
        const existingRest = await tx.restaurant.findUnique({
          where: { id: restaurantId },
          select: { licenseImage: true }
        })
        await tx.restaurant.update({
          where: { id: restaurantId },
          data: {
            status: 'approved',
            open: true,
            phone: app.contactPhone || undefined,
            ...(!existingRest?.licenseImage && app.licenseImage
              ? { licenseImage: app.licenseImage }
              : {})
          }
        })
      }

      const shopName = (app.restaurantName || '').trim() || `${app.contactName}的店`
      await ensureMerchantAdmin(tx, {
        phone: app.contactPhone,
        restaurantId,
        shopName
      })

      const updated = await tx.onboardingApplication.update({
        where: { id },
        data: {
          status: 'approved',
          restaurantId,
          auditedAt: new Date(),
          rejectReason: ''
        },
        include: { user: true, restaurant: true, auditLogs: true }
      })

      await tx.onboardingAuditLog.create({
        data: {
          applicationId: id,
          adminId: req.admin?.id || null,
          adminName: req.admin?.nickname || req.admin?.username || 'admin',
          action: 'approve',
          remark: req.body?.remark || '审核通过'
        }
      })

      return { updated }
    })

    return success(res, mapApp(result.updated), '已通过（后台账号为手机号，默认密码同手机号）')
  } catch (e) {
    next(e)
  }
})

router.post('/:id/reject', adminRequired, requirePermission('onboarding:review'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const reason = (req.body?.reason || '').trim()
    if (!reason) return fail(res, 400, '请填写驳回原因')
    const app = await prisma.onboardingApplication.findUnique({ where: { id } })
    if (!app) return fail(res, 404, '申请不存在', 404)
    if (!['submitted', 'reviewing'].includes(app.status)) {
      return fail(res, 400, '当前状态不可驳回')
    }

    const updated = await prisma.onboardingApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectReason: reason,
        auditedAt: new Date()
      },
      include: { user: true, auditLogs: true }
    })

    await prisma.onboardingAuditLog.create({
      data: {
        applicationId: id,
        adminId: req.admin?.id || null,
        adminName: req.admin?.nickname || req.admin?.username || 'admin',
        action: 'reject',
        remark: reason
      }
    })

    return success(res, mapApp(updated), '已驳回')
  } catch (e) {
    next(e)
  }
})

module.exports = router
