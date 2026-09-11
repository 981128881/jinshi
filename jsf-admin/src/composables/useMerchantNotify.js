import { ref, onMounted, onUnmounted } from 'vue'
import { ElNotification } from 'element-plus'
import { getToken, isValidToken, onTokenChange } from '@/api/request/token'

const WS_PATH = '/api/admin/ws'

/** @type {HTMLAudioElement | null} */
let alertAudio = null

/** 全局单例：避免布局重复挂载时开多个 WS / 弹两次 */
const shared = {
  connected: ref(false),
  /** @type {WebSocket | null} */
  ws: null,
  /** @type {(() => void) | null} */
  offTokenChange: null,
  /** @type {ReturnType<typeof setTimeout> | null} */
  reconnectTimer: null,
  refCount: 0,
  /** @type {Map<string, number>} */
  seenOrders: new Map()
}

function buildWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${WS_PATH}`
}

function playNewOrderSound() {
  try {
    if (!alertAudio) {
      alertAudio = new Audio('/sounds/new_order.mp3')
      alertAudio.preload = 'auto'
    }
    alertAudio.pause()
    alertAudio.currentTime = 0
    const p = alertAudio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        /* 浏览器可能拦截自动播放，忽略 */
      })
    }
  } catch {
    /* ignore */
  }
}

/** 同一订单短时间内只提醒一次 */
function shouldNotify(orderId) {
  const key = String(orderId || '')
  if (!key) return true
  const now = Date.now()
  const last = shared.seenOrders.get(key) || 0
  if (now - last < 15_000) return false
  shared.seenOrders.set(key, now)
  if (shared.seenOrders.size > 200) {
    for (const [k, t] of shared.seenOrders) {
      if (now - t > 60_000) shared.seenOrders.delete(k)
    }
  }
  return true
}

function disconnect() {
  if (shared.reconnectTimer) {
    clearTimeout(shared.reconnectTimer)
    shared.reconnectTimer = null
  }
  if (shared.ws) {
    shared.ws.onclose = null
    shared.ws.close()
    shared.ws = null
  }
  shared.connected.value = false
}

function scheduleReconnect() {
  if (shared.reconnectTimer) return
  shared.reconnectTimer = setTimeout(() => {
    shared.reconnectTimer = null
    connect()
  }, 3000)
}

function handleMessage(event) {
  let payload
  try {
    payload = JSON.parse(event.data)
  } catch {
    return
  }

  if (payload.type === 'connected') {
    shared.connected.value = true
    return
  }

  if (payload.type === 'reservation' || payload.type === 'order.paid') {
    if (!shouldNotify(payload.orderId)) return

    ElNotification({
      title: '新预约单',
      message: `单号 ${payload.orderId}，金额 ¥${payload.totalAmount ?? 0}`,
      type: 'success',
      duration: 8000
    })
    playNewOrderSound()
    window.dispatchEvent(new CustomEvent('merchant:reservation', { detail: payload }))
  }
}

function connect() {
  disconnect()

  const token = getToken()
  if (!isValidToken(token)) return

  try {
    shared.ws = new WebSocket(buildWsUrl())
  } catch {
    scheduleReconnect()
    return
  }

  shared.ws.onopen = () => {
    try {
      shared.ws.send(JSON.stringify({ token }))
    } catch {
      /* ignore */
    }
  }
  shared.ws.onmessage = handleMessage
  shared.ws.onclose = () => {
    shared.connected.value = false
    shared.ws = null
    if (shared.refCount > 0 && isValidToken(getToken())) scheduleReconnect()
  }
  shared.ws.onerror = () => {}
}

/**
 * 运营后台 WebSocket：接收 reservation 并播放音效 + 通知（单例）
 */
export function useMerchantNotify() {
  onMounted(() => {
    shared.refCount += 1
    if (shared.refCount === 1) {
      connect()
      shared.offTokenChange = onTokenChange((next) => {
        if (shared.refCount > 0 && next) connect()
      })
    }
  })

  onUnmounted(() => {
    shared.refCount = Math.max(0, shared.refCount - 1)
    if (shared.refCount === 0) {
      if (shared.offTokenChange) {
        shared.offTokenChange()
        shared.offTokenChange = null
      }
      disconnect()
    }
  })

  return { connected: shared.connected }
}
