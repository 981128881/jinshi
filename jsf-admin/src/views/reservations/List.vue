<template>
  <div class="page-card">
    <div class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item>
          <el-input v-model="query.keyword" placeholder="单号/联系人/电话/餐厅" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" clearable placeholder="状态" style="width: 140px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
      <el-tag v-if="pendingSubmitted" type="warning">待接单 {{ pendingSubmitted }}</el-tag>
    </div>

    <el-table :data="list" v-loading="loading" stripe highlight-current-row @row-click="onRowClick">
      <el-table-column prop="id" label="单号" min-width="150" />
      <el-table-column v-if="!userStore.isOrgAdmin" prop="restaurantName" label="餐厅" min-width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="contactName" label="联系人" width="90" />
      <el-table-column prop="contactPhone" label="电话" width="120" />
      <el-table-column label="预约时间" width="170">
        <template #default="{ row }">{{ formatTime(row.reserveAt) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="90">
        <template #default="{ row }">¥{{ Number(row.totalAmount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="下单时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="goDetail(row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchReservations } from '@/api/admin'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const statusOptions = [
  { value: 'submitted', label: '待接单' },
  { value: 'accepted', label: '制作中' },
  { value: 'ready', label: '待取餐' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const loading = ref(false)
const list = ref([])
const total = ref(0)
const pendingSubmitted = ref(0)
const query = reactive({ keyword: '', status: '', page: 1, pageSize: 10 })

function statusLabel(s) {
  return statusOptions.find((x) => x.value === s)?.label || s
}

function formatTime(v) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 19)
}

function goDetail(id) {
  if (!id) return
  router.push({ name: 'ReservationDetail', params: { id: String(id) } }).catch(() => {
    router.push(`/reservations/${encodeURIComponent(String(id))}`)
  })
}

function onRowClick(row) {
  goDetail(row?.id)
}

async function loadData() {
  loading.value = true
  try {
    const data = await fetchReservations({ ...query })
    list.value = data.list || []
    total.value = data.total || 0
    pendingSubmitted.value = data.pendingSubmitted || 0
  } finally {
    loading.value = false
  }
}

function syncStatusFromRoute() {
  const status = typeof route.query.status === 'string' ? route.query.status : ''
  if (status !== query.status) {
    query.status = status
  }
}

watch(
  () => route.query.status,
  () => {
    syncStatusFromRoute()
    query.page = 1
    loadData()
  }
)

onMounted(() => {
  syncStatusFromRoute()
  loadData()
})
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
:deep(.el-table__row) { cursor: pointer; }
</style>
