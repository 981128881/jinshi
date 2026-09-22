import { ref, onMounted, onUnmounted } from 'vue'
import { ElNotification } from 'element-plus'
import { fetchReservations } from '@/api/modules/reservation'
import { getToken, isValidToken, onTokenChange } from '@/api/request/token'

/** ponytail: 45s 轮询代替 WS，2G 机扛不住长连接 */
const POLL_MS = 45_000

/** @type {HTMLAudioElement | null} */
let alertAudio = null

const shared = {
  active: ref(false),
  /** @type {ReturnType<typeof setInterval> | null} */
  pollTimer: null,
  /** @type {(() => void) | null} */
  offTokenChange: null,
  refCount: 0,
  /** 首轮拉取只建 baseline，不播报 */
  primed: false,
  /** @type {Set<string>} */
  seenSubmitted: new Set(),
  /** @type {Set<string>} */
  seenCancelled: new Set(),
  /** @type {Map<string, number>} */
  notifyDedupe: new Map()
}

function playAlertSound() {
  try {
    if (!alertAudio) {
      alertAudio = new Audio('/sounds/new_order.mp3')
      alertAudio.preload = 'auto'
    }
    alertAudio.pause()
    alertAudio.currentTime = 0
    const p = alertAudio.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* ignore */
  }
}

/** @param {string} kind @param {string|number} orderId */
function shouldNotify(kind, orderId) {
  const key = `${kind}:${orderId || ''}`
  if (!orderId) return true
  const now = Date.now()
  const last = shared.notifyDedupe.get(key) || 0
  if (now - last < 15_000) return false
  shared.notifyDedupe.set(key, now)
  if (shared.notifyDedupe.size > 200) {
    for (const [k, t] of shared.notifyDedupe) {
      if (now - t > 60_000) shared.notifyDedupe.delete(k)
    }
  }
  return true
}

function trimSeen(set, list) {
  if (set.size <= 500) return set
  return new Set(list.map((r) => String(r.id)))
}

function notifyNewOrder(row) {
  if (!shouldNotify('new', row.id)) return
  ElNotification({
    title: '新预约单',
    message: `单号 ${row.id}，金额 ¥${row.totalAmount ?? 0}`,
    type: 'success',
    duration: 8000
  })
  playAlertSound()
  window.dispatchEvent(
    new CustomEvent('merchant:reservation', {
      detail: { orderId: row.id, totalAmount: row.totalAmount, type: 'reservation' }
    })
  )
}

function notifyCancelled(row) {
  if (!shouldNotify('cancel', row.id)) return
  ElNotification({
    title: '预约已取消',
    message: `单号 ${row.id}，金额 ¥${row.totalAmount ?? 0}`,
    type: 'warning',
    duration: 8000
  })
  playAlertSound()
  window.dispatchEvent(
    new CustomEvent('merchant:reservation', {
      detail: { orderId: row.id, totalAmount: row.totalAmount, type: 'cancelled' }
    })
  )
}

async function fetchStatusList(status) {
  const data = await fetchReservations(
    { status, page: 1, pageSize: 30 },
    { loading: false, showError: false }
  )
  return data?.list || []
}

async function pollOnce() {
  if (!isValidToken(getToken())) return
  try {
    const [submitted, cancelled] = await Promise.all([
      fetchStatusList('submitted'),
      fetchStatusList('cancelled')
    ])

    if (!shared.primed) {
      for (const row of submitted) shared.seenSubmitted.add(String(row.id))
      for (const row of cancelled) shared.seenCancelled.add(String(row.id))
      shared.primed = true
      return
    }

    for (const row of submitted) {
      const id = String(row.id)
      if (shared.seenSubmitted.has(id)) continue
      shared.seenSubmitted.add(id)
      notifyNewOrder(row)
    }
    for (const row of cancelled) {
      const id = String(row.id)
      if (shared.seenCancelled.has(id)) continue
      shared.seenCancelled.add(id)
      notifyCancelled(row)
    }

    shared.seenSubmitted = trimSeen(shared.seenSubmitted, submitted)
    shared.seenCancelled = trimSeen(shared.seenCancelled, cancelled)
  } catch {
    /* 网络抖动忽略 */
  }
}

function startPolling() {
  stopPolling()
  if (!isValidToken(getToken())) {
    shared.active.value = false
    return
  }
  shared.active.value = true
  pollOnce()
  shared.pollTimer = setInterval(pollOnce, POLL_MS)
}

function stopPolling() {
  if (shared.pollTimer) {
    clearInterval(shared.pollTimer)
    shared.pollTimer = null
  }
  shared.active.value = false
  shared.primed = false
  shared.seenSubmitted.clear()
  shared.seenCancelled.clear()
}

/**
 * 运营后台：轮询新预约 / 取消，弹窗 + 播一次音（单例）
 */
export function useMerchantNotify() {
  onMounted(() => {
    shared.refCount += 1
    if (shared.refCount === 1) {
      startPolling()
      shared.offTokenChange = onTokenChange((next) => {
        if (shared.refCount > 0) {
          if (next) startPolling()
          else stopPolling()
        }
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
      stopPolling()
    }
  })

  return { connected: shared.active }
}
