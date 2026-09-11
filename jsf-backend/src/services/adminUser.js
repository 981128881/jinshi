const prisma = require('../db/prisma')
const config = require('../config')
const { hashPassword, verifyPassword } = require('../utils/password')
const {
  getEffectivePermissions,
  normalizePermissions,
  ALL_PERMISSION_CODES
} = require('../constants/adminPermissions')

function formatAdminUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname || row.username,
    enabled: row.enabled,
    isSuper: !!row.isSuper && !row.restaurantId,
    restaurantId: row.restaurantId || null,
    restaurantName: row.restaurant?.name || '',
    orgType: row.restaurantId ? 'restaurant' : 'platform',
    permissions: getEffectivePermissions(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

async function ensureDefaultAdmin() {
  const existing = await prisma.adminUser.findUnique({
    where: { username: config.admin.username }
  })
  if (existing) return existing
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin123')) {
    const err = new Error('生产环境首次创建管理员必须设置非默认 ADMIN_PASSWORD')
    err.statusCode = 500
    throw err
  }

  return prisma.adminUser.create({
    data: {
      username: config.admin.username,
      password: hashPassword(config.admin.password),
      nickname: '超级管理员',
      enabled: true,
      isSuper: true,
      permissions: ALL_PERMISSION_CODES
    }
  })
}

async function findAdminByUsername(username) {
  if (!username) return null
  return prisma.adminUser.findUnique({
    where: { username },
    include: { restaurant: { select: { id: true, name: true } } }
  })
}

async function authenticateAdmin(username, password) {
  let user = await findAdminByUsername(username)

  if (!user) {
    const count = await prisma.adminUser.count()
    if (
      count === 0 &&
      username === config.admin.username &&
      password === config.admin.password
    ) {
      user = await ensureDefaultAdmin()
      return user
    }
    return null
  }

  if (!user.enabled) return null
  if (!verifyPassword(password, user.password)) return null
  return user
}

async function getAdminProfile(username) {
  const user = await findAdminByUsername(username)
  if (!user || !user.enabled) return null
  return formatAdminUser(user)
}

async function listAdminUsers() {
  const rows = await prisma.adminUser.findMany({
    orderBy: { id: 'asc' },
    include: { restaurant: { select: { id: true, name: true } } }
  })
  return rows.map(formatAdminUser)
}

async function createAdminUser({ username, password, nickname, enabled = true, isSuper = false, permissions = [] }, operator) {
  const name = String(username || '').trim()
  if (!name || name.length < 2 || name.length > 64) {
    const err = new Error('用户名长度 2-64')
    err.statusCode = 400
    throw err
  }
  if (isSuper && !operator?.isSuper) {
    const err = new Error('只有超级管理员可以创建超管')
    err.statusCode = 403
    throw err
  }
  const exists = await prisma.adminUser.findUnique({ where: { username: name } })
  if (exists) {
    const err = new Error('用户名已存在')
    err.statusCode = 400
    throw err
  }
  if (!password || String(password).length < 6) {
    const err = new Error('密码至少 6 位')
    err.statusCode = 400
    throw err
  }

  const row = await prisma.adminUser.create({
    data: {
      username: name,
      password: hashPassword(password),
      nickname: nickname || name,
      enabled: enabled !== false,
      isSuper: !!isSuper,
      permissions: isSuper ? ALL_PERMISSION_CODES : normalizePermissions(permissions)
    }
  })
  return formatAdminUser(row)
}

async function updateAdminUser(id, { password, nickname, enabled, isSuper, permissions }, operator) {
  const existing = await prisma.adminUser.findUnique({ where: { id } })
  if (!existing) {
    const err = new Error('管理员不存在')
    err.statusCode = 404
    throw err
  }

  if (existing.isSuper && operator?.id !== existing.id && isSuper === false) {
    const err = new Error('不能取消超级管理员的超级权限')
    err.statusCode = 400
    throw err
  }

  const superCount = await prisma.adminUser.count({ where: { isSuper: true } })
  if (existing.isSuper && superCount <= 1 && enabled === false) {
    const err = new Error('至少保留一个可用的超级管理员')
    err.statusCode = 400
    throw err
  }

  if (isSuper != null && !operator?.isSuper) {
    const err = new Error('只有超级管理员可以改超管标记')
    err.statusCode = 403
    throw err
  }

  const data = {}
  if (nickname != null) data.nickname = nickname
  if (enabled != null) data.enabled = !!enabled
  if (isSuper != null) {
    data.isSuper = !!isSuper
    if (data.isSuper) data.permissions = ALL_PERMISSION_CODES
  }
  if (permissions != null && !data.isSuper) {
    data.permissions = normalizePermissions(permissions)
  }
  if (password) {
    if (String(password).length < 6) {
      const err = new Error('密码至少 6 位')
      err.statusCode = 400
      throw err
    }
    data.password = hashPassword(password)
  }

  const row = await prisma.adminUser.update({ where: { id }, data })
  return formatAdminUser(row)
}

async function deleteAdminUser(id, operator) {
  const existing = await prisma.adminUser.findUnique({ where: { id } })
  if (!existing) {
    const err = new Error('管理员不存在')
    err.statusCode = 404
    throw err
  }
  if (operator?.id === id) {
    const err = new Error('不能删除当前登录账号')
    err.statusCode = 400
    throw err
  }
  if (existing.isSuper) {
    const superCount = await prisma.adminUser.count({ where: { isSuper: true } })
    if (superCount <= 1) {
      const err = new Error('至少保留一个超级管理员')
      err.statusCode = 400
      throw err
    }
  }

  await prisma.adminUser.delete({ where: { id } })
  return { id }
}

module.exports = {
  formatAdminUser,
  ensureDefaultAdmin,
  authenticateAdmin,
  getAdminProfile,
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
}
