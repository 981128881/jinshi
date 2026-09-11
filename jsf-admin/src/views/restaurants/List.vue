<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item>
          <el-input v-model="query.keyword" placeholder="门店ID/名称/电话/地址" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" style="width: 140px">
            <el-option label="全部" value="all" />
            <el-option label="已通过" value="approved" />
            <el-option label="待审" value="pending" />
            <el-option label="已停用" value="disabled" />
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
      <el-table-column prop="code" label="门店ID" width="120">
        <template #default="{ row }">{{ row.code || '-' }}</template>
      </el-table-column>
      <el-table-column prop="name" label="餐厅" min-width="140" />
      <el-table-column prop="cuisineName" label="品类" width="100" />
      <el-table-column prop="phone" label="电话" width="120" />
      <el-table-column prop="address" label="地址" min-width="160" show-overflow-tooltip />
      <el-table-column label="营业" width="80">
        <template #default="{ row }">
          <el-tag :type="row.open ? 'success' : 'info'" size="small">{{ row.open ? '营业中' : '打烊' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="dishCount" label="菜品" width="70" />
      <el-table-column prop="orderCount" label="预约单" width="80" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row.id)">管理</el-button>
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
import { reactive, ref, onMounted } from 'vue'
import { fetchRestaurants } from '@/api/admin'
import AppPagination from '@/components/AppPagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ keyword: '', status: 'all', page: 1, pageSize: DEFAULT_PAGE_SIZE })

function statusLabel(s) {
  return { approved: '已通过', pending: '待审', disabled: '已停用', rejected: '已驳回', draft: '草稿' }[s] || s
}

function goDetail(id) {
  if (!id) return
  router.push(`/restaurants/${encodeURIComponent(String(id))}`)
}

function search() {
  query.page = 1
  loadData()
}

function reset() {
  query.keyword = ''
  query.status = 'all'
  query.page = 1
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const data = await fetchRestaurants({
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status && query.status !== 'all' ? { status: query.status } : {})
    })
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

