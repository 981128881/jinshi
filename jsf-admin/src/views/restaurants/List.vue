<template>
  <div class="page-card">
    <div class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item>
          <el-input v-model="query.keyword" placeholder="名称/电话/地址" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="query.status" clearable placeholder="状态" style="width: 140px">
            <el-option label="已通过" value="approved" />
            <el-option label="待审" value="pending" />
            <el-option label="已停用" value="disabled" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="70" />
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
import { reactive, ref, onMounted } from 'vue'
import { fetchRestaurants } from '@/api/admin'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ keyword: '', status: '', page: 1, pageSize: 10 })

function statusLabel(s) {
  return { approved: '已通过', pending: '待审', disabled: '已停用', rejected: '已驳回', draft: '草稿' }[s] || s
}

function goDetail(id) {
  if (!id) return
  router.push(`/restaurants/${encodeURIComponent(String(id))}`)
}

async function loadData() {
  loading.value = true
  try {
    const data = await fetchRestaurants({ ...query })
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (userStore.isOrgAdmin && userStore.restaurantId) {
    router.replace(`/restaurants/${userStore.restaurantId}`)
    return
  }
  loadData()
})
</script>

<style scoped>
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
