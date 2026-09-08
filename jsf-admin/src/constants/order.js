export const ORDER_STATUS = {
  1: { label: '待付款', type: 'warning' },
  2: { label: '待发货', type: 'primary' },
  3: { label: '待收货', type: 'info' },
  4: { label: '已完成', type: 'success' },
  5: { label: '已关闭', type: 'info' },
  6: { label: '已退款', type: 'danger' }
}

export const REFUND_STATUS = {
  0: { label: '无', type: 'info' },
  2: { label: '退款处理中', type: 'warning' },
  3: { label: '已退款', type: 'danger' },
  5: { label: '退款失败', type: 'danger' }
}
