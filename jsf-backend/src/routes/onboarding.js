const express = require('express')
const prisma = require('../db/prisma')
const { success, fail } = require('../utils/response')
const { authRequired } = require('../middleware/auth')
const { resolvePublicUrl } = require('../utils/publicUrl')

const router = express.Router()

const EDITABLE = new Set(['draft', 'rejected'])

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
    submittedAt: row.submittedAt,
    auditedAt: row.auditedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt
  }
}

/** 当前用户最新一条入驻申请 */
router.get('/mine', authRequired, async (req, res, next) => {
  try {
    const row = await prisma.onboardingApplication.findFirst({
      where: { userId: req.userId },
      orderBy: { id: 'desc' }
    })
    return success(res, mapApp(row))
  } catch (e) {
    next(e)
  }
})

/** 保存草稿（可反复） */
router.post('/draft', authRequired, async (req, res, next) => {
  try {
    const body = req.body || {}
    const existing = await prisma.onboardingApplication.findFirst({
      where: { userId: req.userId },
      orderBy: { id: 'desc' }
    })

    if (existing && !EDITABLE.has(existing.status)) {
      return fail(res, 400, '当前状态不可编辑，请等待审核')
    }

    const data = {
      contactName: body.contactName || '',
      contactPhone: body.contactPhone || '',
      legalPerson: body.legalPerson || '',
      licenseNo: body.licenseNo || '',
      licenseImage: body.licenseImage || '',
      restaurantName: body.restaurantName || '',
      cuisineTypeId: body.cuisineTypeId || null,
      address: body.address || '',
      latitude: Number(body.latitude) || 0,
      longitude: Number(body.longitude) || 0,
      doorImage: body.doorImage || '',
      insideImage: body.insideImage || '',
      status: existing?.status === 'rejected' ? 'draft' : (existing?.status || 'draft'),
      rejectReason: existing?.status === 'rejected' ? '' : (existing?.rejectReason || '')
    }

    let row
    if (existing) {
      row = await prisma.onboardingApplication.update({
        where: { id: existing.id },
        data
      })
    } else {
      row = await prisma.onboardingApplication.create({
        data: { ...data, userId: req.userId }
      })
    }
    return success(res, mapApp(row))
  } catch (e) {
    next(e)
  }
})

/** 提交审核 */
router.post('/submit', authRequired, async (req, res, next) => {
  try {
    const body = req.body || {}
    // 允许提交前最后再存一次
    const existing = await prisma.onboardingApplication.findFirst({
      where: { userId: req.userId },
      orderBy: { id: 'desc' }
    })

    if (existing && !EDITABLE.has(existing.status) && existing.status !== 'draft') {
      if (existing.status === 'submitted' || existing.status === 'reviewing') {
        return fail(res, 400, '已提交，请等待审核')
      }
      if (existing.status === 'approved') {
        return fail(res, 400, '已通过审核')
      }
    }

    const restaurantName = (body.restaurantName || existing?.restaurantName || '').trim()
    const contactPhone = (body.contactPhone || existing?.contactPhone || '').trim()
    const address = (body.address || existing?.address || '').trim()
    if (!restaurantName) return fail(res, 400, '请填写门店名称')
    if (!contactPhone) return fail(res, 400, '请填写联系电话')
    if (!address) return fail(res, 400, '请填写门店地址')

    const payload = {
      contactName: body.contactName ?? existing?.contactName ?? '',
      contactPhone,
      legalPerson: body.legalPerson ?? existing?.legalPerson ?? '',
      licenseNo: body.licenseNo ?? existing?.licenseNo ?? '',
      licenseImage: body.licenseImage ?? existing?.licenseImage ?? '',
      restaurantName,
      cuisineTypeId: body.cuisineTypeId ?? existing?.cuisineTypeId ?? null,
      address,
      latitude: Number(body.latitude ?? existing?.latitude) || 0,
      longitude: Number(body.longitude ?? existing?.longitude) || 0,
      doorImage: body.doorImage ?? existing?.doorImage ?? '',
      insideImage: body.insideImage ?? existing?.insideImage ?? '',
      status: 'submitted',
      submittedAt: new Date(),
      rejectReason: ''
    }

    let row
    if (existing) {
      row = await prisma.onboardingApplication.update({
        where: { id: existing.id },
        data: payload
      })
    } else {
      row = await prisma.onboardingApplication.create({
        data: { ...payload, userId: req.userId }
      })
    }

    await prisma.onboardingAuditLog.create({
      data: {
        applicationId: row.id,
        action: 'submit',
        remark: '用户提交入驻申请'
      }
    })

    return success(res, mapApp(row), '已提交，请等待审核')
  } catch (e) {
    next(e)
  }
})

module.exports = router
