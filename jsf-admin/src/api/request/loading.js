import { ElLoading } from 'element-plus'

let count = 0
/** @type {import('element-plus').LoadingInstance | null} */
let instance = null

/**
 * @param {string} [text='加载中...']
 */
export function showLoading(text = '加载中...') {
  count += 1
  if (count === 1) {
    instance = ElLoading.service({
      lock: true,
      text,
      background: 'rgba(0, 0, 0, 0.35)'
    })
  } else if (instance && text) {
    instance.setText(text)
  }
}

export function hideLoading() {
  if (count <= 0) return
  count -= 1
  if (count === 0 && instance) {
    instance.close()
    instance = null
  }
}

export function resetLoading() {
  count = 0
  if (instance) {
    instance.close()
    instance = null
  }
}
