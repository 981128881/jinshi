import { ref, onMounted, onUnmounted } from 'vue'
import { fetchReservations } from '@/api/modules/reservation'
import { getToken, isValidToken, onTokenChange } from '@/api/request/token'

/** ponytail: 45s 轮询发现新单；未点「查看」仅重播语音 */
const POLL_MS = 45_000
/** 未点「查看」时语音重播间隔 */
const REMIND_MS = 5 * 60_000
const SOUND_CHECK_MS = 5_000
const SOUND_NEW = '/sounds/new_reservation.wav'
const SOUND_CANCEL = '/sounds/cancel_reservation.wav'

/** @type {Record<'new'|'cancel', HTMLAudioElement | null>} */
const alertAudios = { new: null, cancel: null }
let audioUnlocked = false
let pendingSound = /** @type {'new'|'cancel'|false} */ (false)
/** @type {(() => void) | null} */
let offUnlockListener = null

/**
 * @typedef {{ kind: 'new'|'cancel', title: string, tip?: string, order: object }} AlertItem
 */

const shared = {
  active: ref(false),
  /** @type {import('vue').Ref<AlertItem | null>} */
  currentAlert: ref(null),
  /** @type {AlertItem[]} */
  alertQueue: [],
  /** @type {ReturnType<typeof setInterval> | null} */
  pollTimer: null,
  /** @type {ReturnType<typeof setInterval> | null} */
  soundTimer: null,
  /** @type {(() => void) | null} */
  offTokenChange: null,
  refCount: 0,
  primed: false,
  /** @type {Set<string>} */
  seenSubmitted: new Set(),
  /** @type {Set<string>} */
  seenCancelled: new Set(),
  /** @type {Map<string, object>} */
  remindCancels: new Map(),
  /** 已弹过窗、尚未点「查看」的单号 → 提醒音频类型 */
  /** @type {Map<string, 'new'|'cancel'>} */
  soundUntilViewed: new Map(),
  /** 上次播报时间 */
  lastSoundAt: 0,
  /** @type {Map<string, number>} */
  notifyDedupe: new Map()
}

/** 管理后台取消不提醒 */
export function shouldAlertCancel(row) {
  return String(row?.cancelSource || '') !== 'admin'
}

/** @param {'new'|'cancel'} [kind] */
function soundUrl(kind) {
  return kind === 'cancel' ? SOUND_CANCEL : SOUND_NEW
}

/** @param {'new'|'cancel'} [kind] */
function ensureAudio(kind = 'new') {
  const k = kind === 'cancel' ? 'cancel' : 'new'
  if (!alertAudios[k]) {
    alertAudios[k] = new Audio(soundUrl(k))
    alertAudios[k].preload = 'auto'
  }
  return alertAudios[k]
}

/** 浏览器需用户手势后才能播；登录后点一下页面即可解锁 */
function bindAudioUnlock() {
  if (offUnlockListener || typeof window === 'undefined') return
  const onInteract = () => {
    const kinds = /** @type {const} */ (['new', 'cancel'])
    if (!audioUnlocked) {
      Promise.all(
        kinds.map((k) => {
          const a = ensureAudio(k)
          a.muted = true
          return a
            .play()
            .then(() => {
              a.pause()
              a.currentTime = 0
              a.muted = false
            })
            .catch(() => {
              a.muted = false
            })
        })
      ).then(() => {
        audioUnlocked = true
        if (pendingSound) {
          const k = pendingSound
          pendingSound = false
          playAlertSound(k)
        }
      })
    } else if (pendingSound) {
      const k = pendingSound
      pendingSound = false
      playAlertSound(k)
    }
  }
  window.addEventListener('pointerdown', onInteract, true)
  window.addEventListener('keydown', onInteract, true)
  offUnlockListener = () => {
    window.removeEventListener('pointerdown', onInteract, true)
    window.removeEventListener('keydown', onInteract, true)
    offUnlockListener = null
  }
}

function unbindAudioUnlock() {
  if (offUnlockListener) offUnlockListener()
}

/** @param {'new'|'cancel'} [kind] */
function playAlertSound(kind = 'new') {
  try {
    const a = ensureAudio(kind)
    a.muted = false
    a.pause()
    a.currentTime = 0
    const p = a.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        pendingSound = kind
      })
    }
  } catch {
    pendingSound = kind
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

/** 弹窗只出一次；同时记入「未查看则重播语音」 */
function presentAlert(alert) {
  if (!alert?.order?.id) return
  const id = String(alert.order.id)
  const kind = alert.kind === 'cancel' ? 'cancel' : 'new'
  shared.soundUntilViewed.set(id, kind)

  if (shared.currentAlert.value) {
    shared.alertQueue.push(alert)
    return
  }

  shared.currentAlert.value = alert
  playAlertSound(kind)
  shared.lastSoundAt = Date.now()
  window.dispatchEvent(
    new CustomEvent('merchant:reservation', {
      detail: {
        orderId: alert.order.id,
        totalAmount: alert.order.totalAmount,
        type: kind === 'cancel' ? 'cancelled' : 'reservation'
      }
    })
  )
}

function dismissAlert() {
  const next = shared.alertQueue.shift() || null
  shared.currentAlert.value = next
  if (next) {
    playAlertSound(next.kind === 'cancel' ? 'cancel' : 'new')
    shared.lastSoundAt = Date.now()
  }
}

/** 点「查看」后停止该单语音重播 */
function acknowledgeView(orderId) {
  if (orderId == null || orderId === '') return
  shared.soundUntilViewed.delete(String(orderId))
}

function notifyNewOrder(row) {
  if (!shouldNotify('new', row.id)) return
  presentAlert({
    kind: 'new',
    title: '新预约单',
    order: row
  })
}

function notifyCancelled(row) {
  if (!shouldNotify('cancel', row.id)) return
  presentAlert({
    kind: 'cancel',
    title: '预约已取消',
    order: row
  })
}

async function fetchStatusList(status) {
  const data = await fetchReservations(
    { status, page: 1, pageSize: 30 },
    { loading: false, showError: false }
  )
  return data?.list || []
}

/** 未点查看：到期只播语音，不再弹窗 */
function maybeSoundRemind() {
  if (!isValidToken(getToken()) || !shared.primed) return
  if (!shared.soundUntilViewed.size) return
  if (!shared.lastSoundAt) return
  const now = Date.now()
  if (now - shared.lastSoundAt < REMIND_MS) return
  // ponytail: 多单未查看时优先播「新单」；否则播取消音
  let kind = /** @type {'new'|'cancel'} */ ('new')
  for (const k of shared.soundUntilViewed.values()) {
    if (k === 'cancel') kind = 'cancel'
  }
  for (const k of shared.soundUntilViewed.values()) {
    if (k === 'new') {
      kind = 'new'
      break
    }
  }
  playAlertSound(kind)
  shared.lastSoundAt = now
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
      if (!shouldAlertCancel(row)) continue
      shared.remindCancels.set(id, row)
      notifyCancelled(row)
    }

    for (const id of [...shared.remindCancels.keys()]) {
      if (!cancelled.some((r) => String(r.id) === id)) shared.remindCancels.delete(id)
    }

    for (const id of [...shared.soundUntilViewed.keys()]) {
      const stillSubmitted = submitted.some((r) => String(r.id) === id)
      const stillCancel = shared.remindCancels.has(id)
      if (!stillSubmitted && !stillCancel) shared.soundUntilViewed.delete(id)
    }

    shared.seenSubmitted = trimSeen(shared.seenSubmitted, submitted)
    shared.seenCancelled = trimSeen(shared.seenCancelled, cancelled)

    maybeSoundRemind()
  } catch {
    /* 网络抖动忽略 */
  }
}

function clearTimers() {
  if (shared.pollTimer) {
    clearInterval(shared.pollTimer)
    shared.pollTimer = null
  }
  if (shared.soundTimer) {
    clearInterval(shared.soundTimer)
    shared.soundTimer = null
  }
}

function resetNotifyState() {
  shared.primed = false
  shared.seenSubmitted.clear()
  shared.seenCancelled.clear()
  shared.remindCancels.clear()
  shared.soundUntilViewed.clear()
  shared.alertQueue = []
  shared.currentAlert.value = null
  shared.lastSoundAt = 0
}

/** 只重启定时器，不清「未查看」状态（token 刷新不能打断语音提醒） */
function startPolling() {
  clearTimers()
  if (!isValidToken(getToken())) {
    shared.active.value = false
    resetNotifyState()
    return
  }
  shared.active.value = true
  pollOnce()
  shared.pollTimer = setInterval(pollOnce, POLL_MS)
  shared.soundTimer = setInterval(maybeSoundRemind, SOUND_CHECK_MS)
}

function stopPolling() {
  clearTimers()
  shared.active.value = false
  resetNotifyState()
}

/**
 * 运营后台：新单/取消弹窗一次；未点查看则按 REMIND_MS 重播语音（单例）
 */
export function useMerchantNotify() {
  onMounted(() => {
    shared.refCount += 1
    if (shared.refCount === 1) {
      bindAudioUnlock()
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
      unbindAudioUnlock()
      stopPolling()
    }
  })

  return {
    connected: shared.active,
    currentAlert: shared.currentAlert,
    dismissAlert,
    acknowledgeView
  }
}
