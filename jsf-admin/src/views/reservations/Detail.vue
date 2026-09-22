<template>
  <div class="page-card detail-page" v-loading="loading">
    <div class="detail-head">
      <div>
        <el-button @click="$router.push('/reservations')">返回列表</el-button>
        <div v-if="detail" class="title-row">
          <h2 class="title">预约 {{ detail.id }} · #{{ detail.dailyNo || '—' }}</h2>
          <el-tag size="small" :type="statusTagType(detail.status)" effect="light">{{ statusLabel(detail.status) }}</el-tag>
        </div>
        <p v-if="detail" class="sub">{{ detail.restaurantName }} · {{ formatTime(detail.reserveAt) }}</p>
      </div>
      <div class="head-actions">
        <el-button v-if="can('accepted')" type="primary" @click="setStatus('accepted')">接单</el-button>
        <el-button v-if="can('ready')" type="success" @click="setStatus('ready')">备餐完成</el-button>
        <el-button v-if="can('completed')" type="success" @click="setStatus('completed')">确认完成</el-button>
        <el-button v-if="can('cancelled')" type="danger" plain @click="setStatus('cancelled')">取消</el-button>
      </div>
    </div>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px" />

    <el-descriptions v-if="detail" class="info-block" :column="2" border>
      <el-descriptions-item label="单号">{{ detail.id }}</el-descriptions-item>
      <el-descriptions-item label="当日序号">#{{ detail.dailyNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag size="small" :type="statusTagType(detail.status)" effect="light">{{ statusLabel(detail.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="餐厅">{{ detail.restaurantName }}</el-descriptions-item>
      <el-descriptions-item label="金额">
        <span class="amount">¥{{ Number(detail.totalAmount).toFixed(2) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="联系人">{{ detail.contactName }}</el-descriptions-item>
      <el-descriptions-item label="电话">{{ detail.contactPhone }}</el-descriptions-item>
      <el-descriptions-item label="预约时间">{{ formatTime(detail.reserveAt) }}</el-descriptions-item>
      <el-descriptions-item label="下单时间">{{ formatTime(detail.createdAt) }}</el-descriptions-item>
      <el-descriptions-item label="用户">{{ detail.userNickname }} {{ detail.userPhone }}</el-descriptions-item>
      <el-descriptions-item label="备注">{{ detail.remark || '-' }}</el-descriptions-item>
    </el-descriptions>

    <section v-if="detail" class="items-section">
      <div class="section-head">
        <h4>菜品明细</h4>
        <span class="section-meta">共 {{ itemCount }} 件</span>
      </div>

      <div v-if="!(detail.items || []).length" class="items-empty">暂无菜品</div>

      <div v-else class="items-table">
        <div class="items-header">
          <span class="col-dish">菜品</span>
          <span class="col-price">单价</span>
          <span class="col-qty">数量</span>
          <span class="col-sub">小计</span>
        </div>

        <div v-for="(row, index) in detail.items" :key="row.id || index" class="items-row">
          <div class="col-dish">
            <div class="dish-thumb" :class="{ placeholder: !row.image }">
              <img v-if="row.image" :src="row.image" :alt="row.name" />
              <span v-else>{{ (row.name || '?').slice(0, 1) }}</span>
            </div>
            <div class="dish-meta">
              <div class="dish-name">{{ row.name }}</div>
            </div>
          </div>
          <div class="col-price">¥{{ Number(row.price).toFixed(2) }}</div>
          <div class="col-qty">×{{ row.quantity }}</div>
          <div class="col-sub">¥{{ lineTotal(row).toFixed(2) }}</div>
        </div>

        <div class="items-footer">
          <span>合计</span>
          <strong>¥{{ Number(detail.totalAmount).toFixed(2) }}</strong>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { confirmAction } from '@/utils/confirm'
import { fetchReservationDetail, updateReservationStatus } from '@/api/admin'

const NEXT = {
  submitted: ['accepted', 'cancelled'],
  accepted: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: []
}

const LABELS = {
  submitted: '待接单',
  accepted: '备餐中',
  ready: '备餐中',
  completed: '已完成',
  cancelled: '已取消'
}

const route = useRoute()
const loading = ref(false)
const detail = ref(null)
const error = ref('')

const orderId = computed(() => decodeURIComponent(String(route.params.id || '')))
const itemCount = computed(() =>
  (detail.value?.items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0)
)

const can = (status) => (NEXT[detail.value?.status] || []).includes(status)
const statusLabel = (s) => LABELS[s] || s
const formatTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-')
const lineTotal = (row) => Number(row.price || 0) * Number(row.quantity || 0)

function statusTagType(status) {
  return (
    {
      submitted: 'warning',
      accepted: 'primary',
      ready: 'primary',
      completed: 'success',
      cancelled: 'danger'
    }[status] || 'info'
  )
}

async function loadData() {
  if (!orderId.value) {
    error.value = '缺少预约单号'
    return
  }
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchReservationDetail(orderId.value)
  } catch (e) {
    detail.value = null
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function setStatus(status) {
  if (status === 'cancelled') {
    if (!(await confirmAction('确定取消该预约？', '取消预约', '取消预约'))) return
  }
  detail.value = await updateReservationStatus(orderId.value, status)
  ElMessage.success('状态已更新')
}

watch(orderId, () => loadData())
onMounted(loadData)
</script>

<style scoped>
.info-block {
  margin-bottom: 20px;
}

.amount {
  color: #c2410c;
  font-weight: 700;
}

.items-section {
  margin-top: 8px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h4 {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.section-meta {
  font-size: 13px;
  color: #94a3b8;
}

.items-empty {
  padding: 28px;
  text-align: center;
  color: #94a3b8;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
}

.items-table {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.items-header,
.items-row,
.items-footer {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 100px 80px 110px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.items-header {
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
}

.items-row {
  border-bottom: 1px solid #f1f5f9;
}

.items-row:last-of-type {
  border-bottom: none;
}

.items-row:hover {
  background: #fafafa;
}

.col-dish {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.dish-thumb {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #fff7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c2410c;
  font-weight: 700;
}

.dish-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  word-break: break-word;
}

.col-price,
.col-qty {
  color: #64748b;
  font-size: 14px;
}

.col-sub {
  color: #0f172a;
  font-weight: 600;
  font-size: 14px;
  text-align: right;
}

.col-price,
.col-qty,
.items-header .col-sub {
  text-align: right;
}

.items-footer {
  background: #fff7ed;
  border-top: 1px solid #fed7aa;
  color: #9a3412;
  font-size: 14px;
  justify-items: stretch;
}

.items-footer span {
  grid-column: 1 / 4;
  text-align: right;
}

.items-footer strong {
  text-align: right;
  font-size: 18px;
  color: #c2410c;
}

@media (max-width: 720px) {
  .items-header {
    display: none;
  }

  .items-row,
  .items-footer {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 12px;
  }

  .col-dish {
    grid-column: 1 / -1;
  }

  .col-price {
    text-align: left;
  }

  .col-qty {
    text-align: right;
  }

  .col-sub {
    grid-column: 1 / -1;
    text-align: right;
    padding-top: 4px;
    border-top: 1px dashed #f1f5f9;
  }

  .items-footer span,
  .items-footer strong {
    grid-column: auto;
  }
}
</style>
