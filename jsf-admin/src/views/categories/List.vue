<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <span></span>
      <el-button v-permission="PERMISSION.CATEGORY_CREATE" type="primary" @click="goCreate">新增分类</el-button>
    </div>

    <div class="table-fill">
    <el-table :data="paged" v-loading="loading" stripe height="100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="图标" width="90">
        <template #default="{ row }">
          <div class="icon-preview" :style="{ background: row.iconBg || '#f5f5f5' }">
            <img v-if="row.iconImage" :src="resolveIconUrl(row.iconImage)" alt="" />
            <span v-else>{{ row.icon || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" />
      <el-table-column label="小程序展示" width="110" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.visible !== false"
            :loading="!!visibleLoading[row.id]"
            @change="(val) => handleVisibleChange(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button v-permission="PERMISSION.CATEGORY_EDIT" link type="primary" @click="goEdit(row.id)">编辑</el-button>
          <el-button v-permission="PERMISSION.CATEGORY_DELETE" link type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    </div>
    <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmAction } from '@/utils/confirm'
import { fetchCategories, updateCategory, deleteCategory } from '@/api/admin'
import { PERMISSION } from '@/constants/permissions'
import appConfig from '@/config/index.js'
import { openAdminPage } from '@/utils/openPage'
import AppPagination from '@/components/AppPagination.vue'
import { useClientPager } from '@/composables/useClientPager'

const loading = ref(false)
const visibleLoading = reactive({})
const list = ref([])
const { page, pageSize, total, paged } = useClientPager(list)

function resolveIconUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const base = (appConfig.fileBaseUrl || '').replace(/\/$/, '')
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path
}

function goCreate() {
  openAdminPage({ name: 'CategoryCreate' })
}

function goEdit(id) {
  openAdminPage({ name: 'CategoryEdit', params: { id } })
}

async function handleVisibleChange(row, visible) {
  visibleLoading[row.id] = true
  const prev = row.visible
  row.visible = visible
  try {
    await updateCategory(row.id, { visible })
    ElMessage.success(visible ? '已在小程序展示' : '已在小程序隐藏')
  } catch {
    row.visible = prev
  } finally {
    visibleLoading[row.id] = false
  }
}

async function loadData() {
  loading.value = true
  try {
    list.value = await fetchCategories()
  } finally {
    loading.value = false
  }
}

async function handleDelete(id) {
  if (!(await confirmAction('确定删除该分类？', '删除确认', '删除'))) return
  await deleteCategory(id)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.icon-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
