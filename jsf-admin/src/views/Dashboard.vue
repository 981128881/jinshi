<template>
  <div class="home-page" v-loading="loading">
    <el-card shadow="never" class="welcome-card">
        <div class="welcome-inner">
          <div>
            <h2 class="welcome-title">你好，{{ displayName }} 👋</h2>
            <p class="welcome-desc">{{ todayText }} · 金石菜牌齐市店运营数据</p>
          </div>
          <div class="welcome-actions">
            <el-button type="primary" @click="$router.push('/reservations')">处理预约单</el-button>
            <el-button @click="$router.push('/restaurants')">餐厅管理</el-button>
          </div>
        </div>
      </el-card>

      <el-row :gutter="16" class="section-row stat-row">
        <el-col :xs="12" :sm="8" :md="4" v-for="item in statCards" :key="item.label">
          <el-card shadow="hover" class="stat-card" :body-style="{ padding: '16px' }">
            <div class="stat-icon" :style="{ background: item.bg }">
              <el-icon :size="22"><component :is="item.icon" /></el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-label">{{ item.label }}</div>
              <div class="stat-value">{{ item.value }}</div>
              <div v-if="item.sub" class="stat-sub">{{ item.sub }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="section-row">
        <el-col :xs="24" :sm="8">
          <el-card shadow="never" class="todo-card todo-warn" @click="$router.push('/reservations')">
            <div class="todo-num">{{ stats.pendingSubmitted ?? stats.pendingPay }}</div>
            <div class="todo-label">待接单</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card shadow="never" class="todo-card todo-primary" @click="$router.push('/reservations')">
            <div class="todo-num">{{ stats.pendingAccepted ?? stats.pendingShip }}</div>
            <div class="todo-label">制作中</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card shadow="never" class="todo-card todo-danger" @click="$router.push('/onboarding')">
            <div class="todo-num">{{ stats.pendingOnboarding ?? 0 }}</div>
            <div class="todo-label">待审入驻</div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="section-row">
        <el-col :xs="24" :lg="16">
          <el-card shadow="never">
            <template #header>
              <div class="card-header-row">
                <span class="card-title">销售趋势</span>
                <el-radio-group v-model="trendPeriod" size="small" @change="renderCharts">
                  <el-radio-button value="day">日</el-radio-button>
                  <el-radio-button value="week">周</el-radio-button>
                  <el-radio-button value="month">月</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="salesChartRef" class="chart-box" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-card shadow="never" class="period-card">
            <template #header>
              <div class="card-header-row">
                <span class="card-title">经营概况</span>
                <el-radio-group v-model="overviewPeriod" size="small">
                  <el-radio-button value="day">日</el-radio-button>
                  <el-radio-button value="week">周</el-radio-button>
                  <el-radio-button value="month">月</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div class="period-stats">
              <div class="period-stat-item sales">
                <div class="period-stat-label">{{ currentPeriod.label }}销售额</div>
                <div class="period-stat-value">¥{{ currentPeriod.sales?.toFixed(2) ?? '0.00' }}</div>
              </div>
              <div class="period-stat-item orders">
                <div class="period-stat-label">{{ currentPeriod.label }}订单数</div>
                <div class="period-stat-value">{{ currentPeriod.orders ?? 0 }} <span class="unit">单</span></div>
              </div>
              <div class="period-stat-item avg" v-if="currentPeriod.orders > 0">
                <div class="period-stat-label">客单价</div>
                <div class="period-stat-value">
                  ¥{{ (currentPeriod.sales / currentPeriod.orders).toFixed(2) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="section-row">
        <el-col :xs="24" :lg="12">
          <el-card shadow="never">
            <template #header>
              <span class="card-title">菜品销量 TOP5</span>
            </template>
            <div ref="topChartRef" class="chart-box chart-box-sm" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header-row">
                <span class="card-title">待取餐</span>
                <el-link type="primary" @click="$router.push('/reservations')">去处理</el-link>
              </div>
            </template>
            <el-table :data="[]" size="small" stripe empty-text="请到预约单查看待取餐列表">
              <el-table-column prop="name" label="说明" min-width="140" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  Money,
  ShoppingCart,
  User,
  Goods,
  TrendCharts,
  Box
} from '@element-plus/icons-vue'
import { fetchDashboard } from '@/api/admin'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const displayName = computed(
  () => userStore.displayName || userStore.username || '管理员'
)
const loading = ref(false)
const trendPeriod = ref('day')
const overviewPeriod = ref('day')

const salesChartRef = ref()
const topChartRef = ref()
/** @type {echarts.ECharts[]} */
const chartInstances = []

const TOP_BAR_COLORS = ['#f59e0b', '#0ea5e9', '#6366f1', '#10b981', '#94a3b8']

const stats = ref({
  productCount: 0,
  categoryCount: 0,
  userCount: 0,
  orderCount: 0,
  todayOrderCount: 0,
  todaySales: 0,
  yesterdaySales: 0,
  yesterdayOrderCount: 0,
  pendingPay: 0,
  pendingShip: 0,
  pendingReceive: 0,
  lowStockCount: 0,
  pendingOnboarding: 0,
  restaurantCount: 0,
  dishCount: 0,
  periodStats: {
    day: { label: '今日', sales: 0, orders: 0 },
    week: { label: '近7日', sales: 0, orders: 0 },
    month: { label: '本月', sales: 0, orders: 0 }
  },
  salesTrend: { day: [], week: [], month: [] },
  topProducts: [],
  lowStockProducts: []
})

const todayText = computed(() => {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`
})

const currentPeriod = computed(() => stats.value.periodStats?.[overviewPeriod.value] || { label: '', sales: 0, orders: 0 })

const salesChange = computed(() => {
  const { todaySales, yesterdaySales } = stats.value
  if (!yesterdaySales) return null
  const diff = ((todaySales - yesterdaySales) / yesterdaySales) * 100
  return diff.toFixed(1)
})

const statCards = computed(() => [
  {
    label: '今日预约额',
    value: `¥${stats.value.todaySales?.toFixed(2) ?? '0.00'}`,
    sub: salesChange.value
      ? `较昨日 ${Number(salesChange.value) >= 0 ? '+' : ''}${salesChange.value}%`
      : '较昨日 --',
    icon: Money,
    bg: 'linear-gradient(135deg,#0ea5e9,#06b6d4)'
  },
  {
    label: '今日预约',
    value: stats.value.todayOrderCount,
    sub: `昨日 ${stats.value.yesterdayOrderCount} 单`,
    icon: ShoppingCart,
    bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)'
  },
  {
    label: '用户总数',
    value: stats.value.userCount,
    sub: `累计预约 ${stats.value.orderCount}`,
    icon: User,
    bg: 'linear-gradient(135deg,#10b981,#34d399)'
  },
  {
    label: '菜品总数',
    value: stats.value.dishCount ?? stats.value.productCount,
    sub: `${stats.value.restaurantCount ?? stats.value.categoryCount} 家餐厅`,
    icon: Goods,
    bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)'
  },
  {
    label: '待取餐',
    value: stats.value.pendingReady ?? stats.value.pendingReceive,
    sub: '制作完成待取',
    icon: Box,
    bg: 'linear-gradient(135deg,#64748b,#94a3b8)'
  },
  {
    label: '客单价',
    value:
      stats.value.todayOrderCount > 0
        ? `¥${(stats.value.todaySales / stats.value.todayOrderCount).toFixed(2)}`
        : '¥0.00',
    sub: '今日均值',
    icon: TrendCharts,
    bg: 'linear-gradient(135deg,#ec4899,#f472b6)'
  }
])

function initChart(el, option) {
  if (!el) return null
  const chart = echarts.init(el)
  chart.setOption(option, true)
  chartInstances.push(chart)
  return chart
}

function normalizeTrend() {
  const trendMap = stats.value.salesTrend || {}
  if (Array.isArray(trendMap)) {
    return { day: trendMap, week: [], month: [] }
  }
  return {
    day: trendMap.day || [],
    week: trendMap.week || [],
    month: trendMap.month || []
  }
}

function renderCharts() {
  chartInstances.forEach((c) => c.dispose())
  chartInstances.length = 0

  const trends = normalizeTrend()
  const trend = trends[trendPeriod.value] || []
  const maxOrders = Math.max(...trend.map((i) => i.orders), 1)
  const orderBarWidth = Math.min(36, Math.max(14, Math.floor(240 / Math.max(trend.length, 1))))

  initChart(salesChartRef.value, {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: { data: ['销售额', '订单数'], bottom: 0 },
    grid: { left: 56, right: 56, top: 32, bottom: 48 },
    xAxis: {
      type: 'category',
      data: trend.map((i) => i.date),
      axisLabel: { interval: 0, rotate: trendPeriod.value === 'week' ? 12 : 0 }
    },
    yAxis: [
      { type: 'value', name: '销售额(元)', splitLine: { lineStyle: { type: 'dashed' } } },
      {
        type: 'value',
        name: '订单数(单)',
        minInterval: 1,
        max: maxOrders <= 5 ? 5 : undefined,
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        data: trend.map((i) => i.sales),
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(14,165,233,0.35)' },
            { offset: 1, color: 'rgba(14,165,233,0.02)' }
          ])
        },
        itemStyle: { color: '#0ea5e9' },
        lineStyle: { width: 3 }
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: orderBarWidth,
        data: trend.map((i) => i.orders),
        itemStyle: {
          color: '#6366f1',
          borderRadius: [6, 6, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          color: '#475569',
          fontSize: 11
        }
      }
    ]
  })

  const tops = [...(stats.value.topProducts || [])].sort((a, b) => b.sales - a.sales)
  const maxSales = Math.max(...tops.map((i) => i.sales), 1)
  const shortName = (name) => (name?.length > 8 ? `${name.slice(0, 8)}…` : name)

  initChart(topChartRef.value, {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params[0]
        const product = tops[item.dataIndex]
        const pct = maxSales ? ((product.sales / maxSales) * 100).toFixed(1) : 0
        return `${product.name}<br/>销量：${product.sales} 件（占 TOP1 的 ${pct}%）`
      }
    },
    grid: { left: 48, right: 24, top: 36, bottom: 56 },
    xAxis: {
      type: 'category',
      data: tops.map((i) => shortName(i.name)),
      axisLabel: { interval: 0, rotate: 20, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: '销量(件)',
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    series: [
      {
        type: 'bar',
        data: tops.map((i, idx) => ({
          value: i.sales,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: TOP_BAR_COLORS[idx] },
              { offset: 1, color: `${TOP_BAR_COLORS[idx]}99` }
            ]),
            borderRadius: [8, 8, 0, 0]
          }
        })),
        barWidth: 48,
        barGap: '30%',
        label: {
          show: true,
          position: 'top',
          formatter: '{c} 件',
          color: '#334155',
          fontWeight: 600
        }
      }
    ]
  })
}

function handleResize() {
  chartInstances.forEach((c) => c.resize())
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await fetchDashboard()
    stats.value = {
      ...stats.value,
      ...data,
      periodStats: data.periodStats || stats.value.periodStats,
      salesTrend: data.salesTrend || stats.value.salesTrend
    }
    await nextTick()
    renderCharts()
  } finally {
    loading.value = false
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstances.forEach((c) => c.dispose())
})
</script>

<style scoped>
.home-page {
  min-height: 100%;
}

.welcome-card {
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #ecfeff 100%);
  border: none;
}

.welcome-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.welcome-title {
  margin: 0 0 4px;
  font-size: 20px;
  color: #0f172a;
}

.welcome-desc {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.section-row {
  margin-bottom: 16px;
}

.stat-row :deep(.el-col) {
  display: flex;
}

.stat-card {
  width: 100%;
  height: 100%;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.stat-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 2px;
}

.stat-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  min-height: 16px;
}

.todo-card {
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s;
  border: none;
  position: relative;
}

.todo-card:hover {
  transform: translateY(-2px);
}

.todo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 8px;
}

.todo-warn {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
}

.todo-primary {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.todo-danger {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
}

.section-title {
  margin: 4px 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.period-stat-card {
  border: none;
  background: #fff;
  height: 100%;
}

.period-stat-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.period-stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.period-stat-label {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.period-stat-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.metric-value .unit {
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.metric-value.accent {
  color: #c2410c;
}

.todo-num {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
}

.todo-label {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.card-title {
  font-weight: 600;
  color: #0f172a;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.chart-box {
  height: 320px;
}

.chart-box-sm {
  height: 300px;
}

.period-card {
  height: 100%;
}

.period-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 272px;
  justify-content: center;
}

.period-stat-item {
  padding: 20px;
  border-radius: 12px;
}

.period-stat-item.sales {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.period-stat-item.orders {
  background: linear-gradient(135deg, #f5f3ff, #ede9fe);
}

.period-stat-item.avg {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
}

.period-stat-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.period-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.period-stat-value .unit {
  font-size: 16px;
  font-weight: 500;
  color: #64748b;
}
</style>
