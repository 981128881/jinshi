const { formatDateTime } = require('../db/formatters')
const { isRedisReady, getRedis, getRedisSubscriber } = require('../db/redis')
const { createLogger } = require('../utils/logger')

const log = createLogger('merchantNotify')

const MERCHANT_CHANNEL = 'merchant:order:paid'

/** @type {Set<(payload: object) => void>} */
const localListeners = new Set()

let redisBridgeStarted = false

function subscribeLocal(listener) {
  localListeners.add(listener)
  return () => localListeners.delete(listener)
}

function broadcastLocal(payload) {
  for (const listener of localListeners) {
    try {
      listener(payload)
    } catch (e) {
      log.error('local listener error', e)
    }
  }
}

async function ensureRedisBridge() {
  if (redisBridgeStarted || !isRedisReady()) return
  redisBridgeStarted = true
  try {
    const sub = getRedisSubscriber()
    await sub.subscribe(MERCHANT_CHANNEL)
    sub.on('message', (channel, message) => {
      if (channel !== MERCHANT_CHANNEL) return
      try {
        broadcastLocal(JSON.parse(message))
      } catch (e) {
        log.error('invalid redis message', e)
      }
    })
    log.info('merchantNotify redis bridge ready')
  } catch (e) {
    redisBridgeStarted = false
    log.warn('merchantNotify redis bridge failed', e)
  }
}

async function publishMerchantNotify(payloadInput) {
  const payload = {
    type: payloadInput.type || 'reservation',
    orderId: payloadInput.orderId,
    restaurantId: payloadInput.restaurantId,
    totalAmount: payloadInput.totalAmount,
    createTime: formatDateTime(payloadInput.createdAt || new Date())
  }

  // Redis 可用时只走 pub/sub（本进程也会经 subscriber 收到一次，避免本地+Redis 双发）
  // Redis 不可用时退回本进程本地扇出
  if (isRedisReady()) {
    try {
      await ensureRedisBridge()
      await getRedis().publish(MERCHANT_CHANNEL, JSON.stringify(payload))
      return payload
    } catch (e) {
      log.warn('redis publish failed, fallback local', e)
    }
  }

  broadcastLocal(payload)
  return payload
}

async function publishOrderPaid(order) {
  return publishMerchantNotify({
    type: 'order.paid',
    orderId: order.id,
    restaurantId: order.restaurantId,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt
  })
}

/** 注册本地监听；跨进程靠 Redis bridge → broadcastLocal */
async function startMerchantNotifySubscriber(onMessage) {
  await ensureRedisBridge()
  return subscribeLocal(onMessage)
}

module.exports = {
  publishOrderPaid,
  publishMerchantNotify,
  startMerchantNotifySubscriber
}
