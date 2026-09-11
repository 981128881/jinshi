import { ElMessageBox } from 'element-plus'

/** @returns {Promise<boolean>} */
export async function confirmAction(message, title = '确认', confirmButtonText = '确定') {
  try {
    await ElMessageBox.confirm(message, title, {
      type: 'warning',
      confirmButtonText,
      cancelButtonText: '取消'
    })
    return true
  } catch {
    return false
  }
}
