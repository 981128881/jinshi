const prisma = require('../db/prisma')
const config = require('../config')
const { formatDateTime } = require('../db/formatters')
const { sendSubscribeMessage, clipWx } = require('../utils/wx')
const { createLogger } = require('../utils/logger')

const log = createLogger('subscribe')

async function merchantOpenids(restaurantId) {
  const members = await prisma.restaurantMember.findMany({
    where: { restaurantId: Number(restaurantId) },
    select: { user: { select: { openid: true } } }
  })
  const set = new Set()
  for (const m of members) {
    if (m.user && m.user.openid) set.add(m.user.openid)
  }
  return set
}

async function sendToOpenids({ openids, templateId, page, data }) {
  if (!templateId || config.wx.mock) return
  for (const openid of openids) {
    const result = await sendSubscribeMessage({ openid, templateId, page, data })
    if (result && result.errcode && result.errcode !== 43101) {
      log.warn('subscribe send failed', { errcode: result.errcode, errmsg: result.errmsg })
    }
  }
}

/** 下单成功：通知店主 + 下单用户（各需事先授权对应模板） */
async function notifyNewReservation(order) {
  const tmplId = config.wx.subscribeOrderTmplId
  if (!tmplId) return
  const phone = String(order.contactPhone || '').trim()
  if (!/^1\d{10}$/.test(phone)) return

  const openids = await merchantOpenids(order.restaurantId)
  if (order.userId) {
    const customer = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { openid: true }
    })
    if (customer && customer.openid) openids.add(customer.openid)
  }

  const page = `pages/merchant/orders?restaurantId=${order.restaurantId}`
  const data = {
    character_string3: { value: clipWx(order.id, 32) },
    name8: { value: clipWx(order.contactName || '顾客', 10) },
    phone_number16: { value: phone },
    time18: { value: formatDateTime(order.reserveAt || order.createdAt || new Date()) },
    amount4: { value: `${Number(order.totalAmount).toFixed(2)}元` }
  }
  await sendToOpenids({ openids, templateId: tmplId, page, data })
}

/** 订单取消：仅通知店主（需授权「订单取消通知」模板） */
async function notifyReservationCancelled(order, reason) {
  const tmplId = config.wx.subscribeCancelTmplId
  if (!tmplId) return
  const openids = await merchantOpenids(order.restaurantId)
  if (!openids.size) return

  const page = `pages/merchant/orders?restaurantId=${order.restaurantId}`
  const data = {
    character_string3: { value: clipWx(order.id, 32) },
    time9: { value: formatDateTime(order.reserveAt || order.createdAt || new Date()) },
    amount4: { value: `${Number(order.totalAmount).toFixed(2)}元` },
    thing2: { value: clipWx(reason || '预约已取消', 20) }
  }
  await sendToOpenids({ openids, templateId: tmplId, page, data })
}

module.exports = { notifyNewReservation, notifyReservationCancelled }
