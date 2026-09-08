<template>
  <div class="page-card">
    <div class="toolbar">
      <span></span>
      <el-button type="primary" @click="goCreate">新增活动</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
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
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchPromotions, deletePromotion } from '@/api/admin'
import { openAdminPage } from '@/utils/openPage'

const loading = ref(false)
const list = ref([])

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
  await deletePromotion(id)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>
