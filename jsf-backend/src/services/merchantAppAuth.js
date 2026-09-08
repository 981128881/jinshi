const config = require('../config')
const prisma = require('../db/prisma')
const { signToken } = require('../utils/jwt')
const { hashPassword, verifyPassword } = require('../utils/password')
const { resolvePublicUrl } = require('../utils/publicUrl')

function formatRestaurant(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    logo: resolvePublicUrl(row.logo || ''),
    phone: row.phone || '',
    address: row.address || '',
    open: row.open,
    status: row.status
  }
}

/** 规范化手机号（仅数字） */
function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

async function loginMerchantApp(username, password) {
  const name = String(username || '').trim()
  const pwd = String(password || '')
  if (!name || !pwd) {
    const err = new Error('请输入账号和密码')
    err.statusCode = 400
    throw err
  }

  const account = await prisma.merchantAppAccount.findUnique({
    where: { username: name },
    include: { restaurant: true }
  })
  if (!account || !account.enabled) {
    const err = new Error('账号或密码错误')
    err.statusCode = 401
    throw err
  }
  if (!verifyPassword(pwd, account.password)) {
    const err = new Error('账号或密码错误')
    err.statusCode = 401
    throw err
  }
  if (account.restaurant.status === 'disabled') {
    const err = new Error('餐厅已停用')
    err.statusCode = 403
    throw err
  }

  const accessToken = signToken(
    {
      role: 'merchant_app',
      type: 'access',
      accountId: account.id,
      restaurantId: account.restaurantId,
      username: account.username
    },
    config.admin?.accessExpiresIn || config.jwtExpiresIn || '7d'
  )

  return {
    accessToken,
    token: accessToken,
    username: account.username,
    restaurantId: account.restaurantId,
    restaurant: formatRestaurant(account.restaurant)
  }
}

async function getMerchantAppProfile(accountId) {
  const account = await prisma.merchantAppAccount.findUnique({
    where: { id: accountId },
    include: { restaurant: true }
  })
  if (!account || !account.enabled) return null
  return {
    username: account.username,
    restaurantId: account.restaurantId,
    restaurant: formatRestaurant(account.restaurant)
  }
}

/**
 * 为店主确保商家 App 账号：用户名优先用手机号，默认密码=手机号。
 * 若手机号已被其他餐厅占用，则用 phone_restaurantId。
 */
async function ensureOwnerAppAccount(restaurantId, phone, opts = {}) {
  const client = opts.client || prisma
  const rid = Number(restaurantId)
  const phoneDigits = normalizePhone(phone)
  if (!rid) {
    const err = new Error('缺少餐厅 ID')
    err.statusCode = 400
    throw err
  }
  if (!phoneDigits || phoneDigits.length < 6) {
    const err = new Error('店主手机号无效，无法创建商家 App 账号')
    err.statusCode = 400
    throw err
  }

  const existingForShop = await client.merchantAppAccount.findFirst({
    where: { restaurantId: rid }
  })

  let username = phoneDigits
  const taken = await client.merchantAppAccount.findUnique({ where: { username } })
  if (taken && taken.restaurantId !== rid) {
    username = `${phoneDigits}_${rid}`
  }

  if (existingForShop) {
    const data = {
      username,
      enabled: true
    }
    if (opts.forceResetPassword) {
      data.password = hashPassword(phoneDigits)
    }
    return client.merchantAppAccount.update({
      where: { id: existingForShop.id },
      data
    })
  }

  return client.merchantAppAccount.create({
    data: {
      restaurantId: rid,
      username,
      password: hashPassword(phoneDigits),
      enabled: true
    }
  })
}

/** 将密码重置为当前餐厅电话（纯数字） */
async function resetOwnerAppPasswordToPhone(restaurantId) {
  const rid = Number(restaurantId)
  const restaurant = await prisma.restaurant.findUnique({ where: { id: rid } })
  if (!restaurant) {
    const err = new Error('餐厅不存在')
    err.statusCode = 404
    throw err
  }
  const phoneDigits = normalizePhone(restaurant.phone)
  if (!phoneDigits || phoneDigits.length < 6) {
    const err = new Error('请先在餐厅资料中填写有效手机号')
    err.statusCode = 400
    throw err
  }
  return ensureOwnerAppAccount(rid, phoneDigits, { forceResetPassword: true })
}

async function upsertMerchantAppAccount(restaurantId, { username, password, enabled }) {
  const name = String(username || '').trim()
  if (!name) {
    const err = new Error('账号不能为空')
    err.statusCode = 400
    throw err
  }

  const existingByUser = await prisma.merchantAppAccount.findUnique({ where: { username: name } })
  const existingForShop = await prisma.merchantAppAccount.findFirst({
    where: { restaurantId: Number(restaurantId) }
  })

  if (existingByUser && existingByUser.restaurantId !== Number(restaurantId)) {
    const err = new Error('账号已被其他餐厅使用')
    err.statusCode = 400
    throw err
  }

  const data = {
    username: name,
    enabled: enabled !== false
  }
  if (password) {
    data.password = hashPassword(String(password))
  }

  if (existingForShop) {
    if (!password && existingForShop.username === name && enabled === undefined) {
      return existingForShop
    }
    if (!password) delete data.password
    return prisma.merchantAppAccount.update({
      where: { id: existingForShop.id },
      data: {
        ...data,
        enabled: enabled != null ? !!enabled : undefined
      }
    })
  }

  if (!password) {
    const err = new Error('首次创建必须设置密码')
    err.statusCode = 400
    throw err
  }

  return prisma.merchantAppAccount.create({
    data: {
      restaurantId: Number(restaurantId),
      username: name,
      password: data.password,
      enabled: enabled !== false
    }
  })
}

async function getMerchantAppAccountByRestaurant(restaurantId) {
  return prisma.merchantAppAccount.findFirst({
    where: { restaurantId: Number(restaurantId) },
    select: {
      id: true,
      username: true,
      enabled: true,
      restaurantId: true,
      createdAt: true,
      updatedAt: true
    }
  })
}

async function deleteMerchantAppAccount(restaurantId) {
  const row = await prisma.merchantAppAccount.findFirst({
    where: { restaurantId: Number(restaurantId) }
  })
  if (!row) return { deleted: false }
  await prisma.merchantAppAccount.delete({ where: { id: row.id } })
  return { deleted: true }
}

module.exports = {
  loginMerchantApp,
  getMerchantAppProfile,
  ensureOwnerAppAccount,
  resetOwnerAppPasswordToPhone,
  upsertMerchantAppAccount,
  getMerchantAppAccountByRestaurant,
  deleteMerchantAppAccount,
  normalizePhone,
  formatRestaurant
}
