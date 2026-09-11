<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <span></span>
      <el-button type="primary" @click="goCreate">新增活动</el-button>
    </div>

    <div class="table-fill">
    <el-table :data="paged" v-loading="loading" stripe height="100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="title" label="标题" min-width="140" />
      <el-table-column prop="startTime" label="开始" width="120" />
      <el-table-column prop="endTime" label="结束" width="120" />
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="goEdit(row.id)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    </div>
    <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmAction } from '@/utils/confirm'
import { fetchPromotions, deletePromotion } from '@/api/admin'
import { openAdminPage } from '@/utils/openPage'
import AppPagination from '@/components/AppPagination.vue'
import { useClientPager } from '@/composables/useClientPager'

const loading = ref(false)
const list = ref([])
const { page, pageSize, total, paged } = useClientPager(list)

function goCreate() {
  openAdminPage({ name: 'PromotionCreate' })
}

function goEdit(id) {
  openAdminPage({ name: 'PromotionEdit', params: { id } })
}

async function loadData() {
  loading.value = true
  try {
    list.value = await fetchPromotions()
  } finally {
    loading.value = false
  }
}

async function handleDelete(id) {
  if (!(await confirmAction('确定删除该活动？', '删除确认', '删除'))) return
  await deletePromotion(id)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>
