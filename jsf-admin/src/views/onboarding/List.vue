<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item>
          <el-select v-model="query.status" style="width: 160px">
            <el-option label="全部" value="all" />
            <el-option label="待审" value="submitted" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-fill">
    <el-table :data="list" v-loading="loading" stripe height="100%">
      <el-table-column prop="restaurantCode" label="门店ID" width="120">
        <template #default="{ row }">{{ row.restaurantCode || '-' }}</template>
      </el-table-column>
      <el-table-column label="门店" min-width="140">
        <template #default="{ row }">{{ row.restaurantName || row.contactName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="contactName" label="联系人" width="100" />
      <el-table-column prop="contactPhone" label="电话" width="130" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row.id)">详情</el-button>
          <el-button
            v-if="['submitted', 'reviewing'].includes(row.status)"
            link
            type="success"
            @click="approve(row)"
          >通过</el-button>
          <el-button
            v-if="['submitted', 'reviewing'].includes(row.status)"
            link
            type="danger"
            @click="reject(row)"
          >驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
    </div>

    <AppPagination
      v-model:page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      @change="load"
    />

  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { get, post } from '@/api/request'
import AppPagination from '@/components/AppPagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'

const STATUS = {
  submitted: { label: '待审', type: 'warning' },
  reviewing: { label: '审核中', type: '' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
}

const router = useRouter()
const query = reactive({ status: 'all', page: 1, pageSize: DEFAULT_PAGE_SIZE })
const list = ref([])
const total = ref(0)
const loading = ref(false)

function statusLabel(s) {
  return STATUS[s]?.label || s || '-'
}

function statusType(s) {
  return STATUS[s]?.type || 'info'
}

function search() {
  query.page = 1
  load()
}

function reset() {
  query.status = 'all'
  query.page = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const params = { page: query.page, pageSize: query.pageSize }
    if (query.status && query.status !== 'all') params.status = query.status
    const data = await get('/admin/onboarding', { params })
    list.value = data?.list || []
    total.value = data?.total || 0
  } finally {
    loading.value = false
  }
}

function goDetail(id) {
  if (!id) return
  router.push(`/onboarding/${id}`)
}

async function approve(row) {
  await ElMessageBox.confirm(`确认通过「${row.restaurantName || row.contactName}」？`, '审核通过')
  await post(`/admin/onboarding/${row.id}/approve`, {})
  ElMessage.success('已通过')
  load()
}

async function reject(row) {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', {
    inputPattern: /.+/,
    inputErrorMessage: '原因必填'
  })
  await post(`/admin/onboarding/${row.id}/reject`, { reason: value })
  ElMessage.success('已驳回')
  load()
}

onMounted(load)
</script>
