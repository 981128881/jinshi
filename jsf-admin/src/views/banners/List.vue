<template>
  <div class="page-card">
    <div class="toolbar">
      <span></span>
      <el-button type="primary" @click="goCreate">新增轮播</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="图片" width="120">
        <template #default="{ row }">
          <el-image :src="row.imageUrl" style="width: 100px; height: 40px" fit="cover" />
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="link" label="链接" show-overflow-tooltip />
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
import { fetchBanners, deleteBanner } from '@/api/admin'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const list = ref([])

function goCreate() {
  router.push('/banners/new')
}

function goEdit(id) {
  router.push(`/banners/${id}/edit`)
}

async function loadData() {
  loading.value = true
  try {
    list.value = await fetchBanners()
  } finally {
    loading.value = false
  }
}

async function handleDelete(id) {
  await deleteBanner(id)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>
