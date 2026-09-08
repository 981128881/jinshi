<template>
  <div class="page-card">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="query.keyword" placeholder="搜索商品" clearable style="width: 200px" @keyup.enter="loadData" />
        <el-select v-model="query.categoryId" placeholder="全部分类" clearable style="width: 140px" @change="loadData">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
        <span class="sort-hint">按销量从高到低</span>
      </div>
      <div class="actions">
        <el-button
          v-permission="PERMISSION.PRODUCT_EXPORT"
          :loading="exporting"
          @click="handleExportAll"
        >
          导出全部 Excel
        </el-button>
        <el-button
          v-if="selectedRows.length"
          v-permission="PERMISSION.PRODUCT_EXPORT"
          :loading="exporting"
          @click="handleExportSelected"
        >
          导出已选 ({{ selectedRows.length }})
        </el-button>
        <el-button v-permission="PERMISSION.PRODUCT_CREATE" type="primary" @click="goCreate">新增商品</el-button>
      </div>
    </div>

    <div v-if="selectedRows.length" class="batch-bar">
      <span class="batch-tip">已选 <strong>{{ selectedRows.length }}</strong> 项</span>
      <el-button v-permission="PERMISSION.PRODUCT_BATCH_CATEGORY" size="small" @click="openBatchCategory">批量改分类</el-button>
      <el-popconfirm
        :title="`确认删除选中的 ${selectedRows.length} 个商品？`"
        @confirm="handleBatchDelete"
      >
        <template #reference>
          <el-button v-permission="PERMISSION.PRODUCT_BATCH_DELETE" size="small" type="danger" :loading="batchLoading">批量删除</el-button>
        </template>
      </el-popconfirm>
      <el-button size="small" link @click="clearSelection">取消选择</el-button>
    </div>

    <el-table
      ref="tableRef"
      :data="list"
      v-loading="loading"
      stripe
      row-key="id"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="48" reserve-selection />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="图片" width="80">
        <template #default="{ row }">
          <el-image :src="row.image" style="width: 48px; height: 48px" fit="cover" />
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="sales" width="100" align="right">
        <template #header>
          <span class="col-sales-header">销量 <span class="sort-mark">↓</span></span>
        </template>
        <template #default="{ row }">
          <span :class="{ 'sales-hot': (row.sales || 0) > 0 }">{{ row.sales ?? 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="price" label="售价" width="90">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="80">
        <template #default="{ row }">
          <span :class="{ 'stock-low': row.stock <= 10 }">{{ row.stock ?? 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="100">
        <template #default="{ row }">{{ categoryMap[row.categoryId] || row.categoryId }}</template>
      </el-table-column>
      <el-table-column label="小程序展示" width="110" align="center">
        <template #default="{ row }">
          <el-switch
            v-permission="PERMISSION.PRODUCT_TOGGLE"
            :model-value="row.visible !== false"
            :loading="!!visibleLoading[row.id]"
            @change="(val) => handleVisibleChange(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="精品推荐" width="110" align="center">
        <template #default="{ row }">
          <el-switch
            v-permission="PERMISSION.PRODUCT_TOGGLE"
            :model-value="!!row.featured"
            :loading="!!featuredLoading[row.id]"
            @change="(val) => handleFeaturedChange(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button v-permission="PERMISSION.PRODUCT_EDIT" link type="primary" @click="goEdit(row.id)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button v-permission="PERMISSION.PRODUCT_DELETE" link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <AppPagination v-model:page="query.page" v-model:page-size="query.pageSize" :total="total" @change="loadData" />

    <el-dialog v-model="batchCategoryVisible" title="批量修改分类" width="400px" destroy-on-close>
      <p class="batch-dialog-tip">将 {{ selectedRows.length }} 个商品移动到：</p>
      <el-select v-model="batchCategoryId" placeholder="选择分类" style="width: 100%">
        <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <template #footer>
        <el-button @click="batchCategoryVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchLoading" @click="handleBatchCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppPagination from '@/components/AppPagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { PERMISSION } from '@/constants/permissions'
import {
  fetchProducts,
  fetchCategories,
  updateProduct,
  deleteProduct,
  batchDeleteProducts,
  batchUpdateProductCategory,
  exportProducts
} from '@/api/admin'

import { openAdminPage } from '@/utils/openPage'

const loading = ref(false)
const exporting = ref(false)
const batchLoading = ref(false)
const visibleLoading = reactive({})
const featuredLoading = reactive({})
const list = ref([])
const total = ref(0)
const categories = ref([])
const batchCategoryVisible = ref(false)
const batchCategoryId = ref(null)
const tableRef = ref()
const selectedRows = ref([])

const query = reactive({ keyword: '', categoryId: null, page: 1, pageSize: DEFAULT_PAGE_SIZE })

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c.name]))
)

function goCreate() {
  openAdminPage({ name: 'ProductCreate' })
}

function goEdit(id) {
  openAdminPage({ name: 'ProductEdit', params: { id } })
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selectedRows.value = []
}

function selectedIds() {
  return selectedRows.value.map((r) => r.id)
}

async function handleFeaturedChange(row, featured) {
  featuredLoading[row.id] = true
  const prev = row.featured
  row.featured = featured
  try {
    await updateProduct(row.id, { featured })
    ElMessage.success(featured ? '已加入精品推荐' : '已移出精品推荐')
  } catch (e) {
    row.featured = prev
  } finally {
    featuredLoading[row.id] = false
  }
}

async function handleVisibleChange(row, visible) {
  visibleLoading[row.id] = true
  const prev = row.visible
  row.visible = visible
  try {
    await updateProduct(row.id, { visible })
    ElMessage.success(visible ? '已在小程序展示' : '已在小程序隐藏')
  } catch (e) {
    row.visible = prev
  } finally {
    visibleLoading[row.id] = false
  }
}

async function handleExportAll() {
  exporting.value = true
  try {
    await exportProducts()
    ElMessage.success('导出完成')
  } catch (e) {
    if (!e?.message?.includes?.('cancel')) {
      ElMessage.error('导出失败，请稍后重试')
    }
  } finally {
    exporting.value = false
  }
}

async function handleExportSelected() {
  const ids = selectedIds()
  if (!ids.length) return
  exporting.value = true
  try {
    await exportProducts({ ids: ids.join(',') })
    ElMessage.success(`已导出 ${ids.length} 个商品`)
  } catch (e) {
    if (!e?.message?.includes?.('cancel')) {
      ElMessage.error('导出失败，请稍后重试')
    }
  } finally {
    exporting.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const data = await fetchProducts(query)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function openBatchCategory() {
  if (!selectedRows.value.length) return
  batchCategoryId.value = categories.value[0]?.id || null
  batchCategoryVisible.value = true
}

async function handleDelete(id) {
  await deleteProduct(id)
  ElMessage.success('已删除')
  loadData()
}

async function handleBatchDelete() {
  const ids = selectedIds()
  if (!ids.length) return
  batchLoading.value = true
  try {
    const { count } = await batchDeleteProducts(ids)
    ElMessage.success(`已删除 ${count} 个商品`)
    clearSelection()
    loadData()
  } finally {
    batchLoading.value = false
  }
}

async function handleBatchCategory() {
  const ids = selectedIds()
  if (!ids.length || !batchCategoryId.value) {
    ElMessage.warning('请选择分类')
    return
  }
  batchLoading.value = true
  try {
    const { count } = await batchUpdateProductCategory(ids, batchCategoryId.value)
    ElMessage.success(`已更新 ${count} 个商品分类`)
    batchCategoryVisible.value = false
    clearSelection()
    loadData()
  } finally {
    batchLoading.value = false
  }
}

onMounted(async () => {
  categories.value = await fetchCategories()
  loadData()
})
</script>

<style scoped>
.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.sort-hint {
  font-size: 13px;
  color: #0ea5e9;
  background: #e0f2fe;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
}

.col-sales-header {
  font-weight: 600;
  color: #0f172a;
}

.sort-mark {
  color: #0ea5e9;
  font-weight: 700;
}

.sales-hot {
  color: #0f172a;
  font-weight: 600;
}

.toolbar .actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
}

.batch-tip {
  font-size: 14px;
  color: #334155;
}

.batch-dialog-tip {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 14px;
}

.stock-low {
  color: #f56c6c;
  font-weight: 600;
}
</style>
