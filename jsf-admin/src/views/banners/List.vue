<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <span></span>
      <el-button type="primary" @click="goCreate">新增轮播</el-button>
    </div>

    <div class="table-fill">
    <el-table :data="paged" v-loading="loading" stripe height="100%">
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
import { fetchBanners, deleteBanner } from '@/api/admin'
import AppPagination from '@/components/AppPagination.vue'
import { useClientPager } from '@/composables/useClientPager'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const { page, pageSize, total, paged } = useClientPager(list)

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
  if (!(await confirmAction('确定删除该轮播？', '删除确认', '删除'))) return
  await deleteBanner(id)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>
