<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item>
          <el-input v-model="query.keyword" placeholder="单号/联系人/电话/餐厅" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" style="width: 140px">
            <el-option label="全部" value="all" />
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
      <el-tag v-if="pendingSubmitted" type="warning">待接单 {{ pendingSubmitted }}</el-tag>
    </div>

    <div class="table-fill">
    <el-table :data="list" v-loading="loading" stripe highlight-current-row height="100%" @row-click="onRowClick">
      <el-table-column prop="id" label="单号" min-width="150" />
      <el-table-column prop="restaurantName" label="餐厅" min-width="120" />
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
    </div>

    <AppPagination
      v-model:page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      @change="loadData"
    />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchReservations } from '@/api/admin'
import AppPagination from '@/components/AppPagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'

const route = useRoute()
const router = useRouter()

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
const query = reactive({ keyword: '', status: 'all', page: 1, pageSize: DEFAULT_PAGE_SIZE })

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

function search() {
  query.page = 1
  loadData()
}

function reset() {
  query.keyword = ''
  query.status = 'all'
  query.page = 1
  if (route.query.status) {
    const next = { ...route.query }
    delete next.status
    router.replace({ query: next })
    return
  }
  loadData()
}

function onRowClick(row) {
  goDetail(row?.id)
}

async function loadData() {
  loading.value = true
  try {
    const data = await fetchReservations({
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status && query.status !== 'all' ? { status: query.status } : {})
    })
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
    query.status = status && status !== 'all' ? status : 'all'
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
:deep(.el-table__row) { cursor: pointer; }
</style>
