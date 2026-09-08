import { get } from '@/api/request'
import { useMockApi, mockDelay } from '@/api/_mock'

const MOCK_DASHBOARD = {
  productCount: 56,
  categoryCount: 10,
  userCount: 1024,
  orderCount: 128,
  todayOrderCount: 23,
  todaySales: 5680.5,
  yesterdaySales: 4920,
  yesterdayOrderCount: 19,
  pendingPay: 5,
  pendingShip: 8,
  pendingReceive: 3,
  lowStockCount: 4,
  salesTrend: [
    { date: '6/25', sales: 3200, orders: 12 },
    { date: '6/26', sales: 4100, orders: 15 },
    { date: '6/27', sales: 3800, orders: 14 },
    { date: '6/28', sales: 4500, orders: 18 },
    { date: '6/29', sales: 5200, orders: 20 },
    { date: '6/30', sales: 4920, orders: 19 },
    { date: '7/1', sales: 5680.5, orders: 23 }
  ],
  orderStatusChart: [
    { status: 1, label: '待付款', count: 5 },
    { status: 2, label: '待发货', count: 8 },
    { status: 3, label: '待收货', count: 3 },
    { status: 4, label: '已完成', count: 102 },
    { status: 5, label: '已关闭', count: 10 }
  ],
  topProducts: [
    { id: 1, name: '有机牛奶 1L', sales: 320, price: 12.9, stock: 86 },
    { id: 2, name: '五常大米 5kg', sales: 256, price: 49.9, stock: 42 },
    { id: 3, name: '鲜鸡蛋 30枚', sales: 198, price: 28.8, stock: 8 },
    { id: 4, name: '智利车厘子 500g', sales: 156, price: 59.9, stock: 15 },
    { id: 5, name: '洗衣液 2kg', sales: 142, price: 35.0, stock: 55 }
  ],
  lowStockProducts: [
    { id: 3, name: '鲜鸡蛋 30枚', stock: 8, price: 28.8 },
    { id: 8, name: '婴儿纸尿裤 L码', stock: 5, price: 89.0 },
    { id: 12, name: '进口牛油果 4个', stock: 3, price: 19.9 },
    { id: 15, name: '鲜切花束', stock: 2, price: 39.9 }
  ],
  recentOrders: [
    { id: 'O20250630001', status: 2, statusLabel: '待发货', totalAmount: 128.5, createTime: '2026-06-30 18:20:01', nickname: '张三' },
    { id: 'O20250630002', status: 1, statusLabel: '待付款', totalAmount: 56.0, createTime: '2026-06-30 17:45:12', nickname: '李四' },
    { id: 'O20250630003', status: 4, statusLabel: '已完成', totalAmount: 299.0, createTime: '2026-06-30 16:30:00', nickname: '王五' }
  ]
}

/** @param {import('@/api/request/types.js').RequestOptions} [options] */
export function fetchDashboard(options = {}) {
  return useMockApi(
    () => get('/admin/dashboard', options),
    async () => {
      await mockDelay()
      return MOCK_DASHBOARD
    }
  )
}
