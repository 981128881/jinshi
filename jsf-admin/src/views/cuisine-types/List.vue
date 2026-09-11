<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <span></span>
      <el-button type="primary" @click="openCreate">新增品类</el-button>
    </div>
    <div class="table-fill">
    <el-table :data="paged" v-loading="loading" stripe height="100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="icon" label="图标" width="100" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="restaurantCount" label="餐厅数" width="90" />
      <el-table-column label="显示" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.visible ? 'success' : 'info'">{{ row.visible ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    </div>
    <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑品类' : '新增品类'" width="420px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" placeholder="可选 emoji/文字" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="显示"><el-switch v-model="form.visible" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmAction } from '@/utils/confirm'
import { fetchCuisineTypes, createCuisineType, updateCuisineType, deleteCuisineType } from '@/api/admin'
import AppPagination from '@/components/AppPagination.vue'
import { useClientPager } from '@/composables/useClientPager'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const { page, pageSize, total, paged } = useClientPager(list)
const dialogVisible = ref(false)
const editingId = ref(null)
const form = reactive({ name: '', icon: '', sort: 0, visible: true })

async function loadData() {
  loading.value = true
  try {
    list.value = await fetchCuisineTypes()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', icon: '', sort: 0, visible: true })
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, { name: row.name, icon: row.icon, sort: row.sort, visible: row.visible })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name.trim()) return ElMessage.warning('请填写名称')
  saving.value = true
  try {
    if (editingId.value) await updateCuisineType(editingId.value, { ...form })
    else await createCuisineType({ ...form })
    dialogVisible.value = false
    ElMessage.success('已保存')
    loadData()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  if (!(await confirmAction('确定删除该品类？', '删除确认', '删除'))) return
  await deleteCuisineType(id)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>
