<template>
  <div class="menu-editor" v-loading="loading">
    <div class="section-head">
      <h4>分类</h4>
      <el-button size="small" type="primary" @click="addCategory">新增分类</el-button>
    </div>
    <el-table :data="categories" size="small" stripe empty-text="暂无分类">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="显示" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.visible ? 'success' : 'info'">{{ row.visible ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="editCategory(row)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="removeCategory(row.id)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="section-head" style="margin-top: 24px">
      <h4>菜品</h4>
      <el-button size="small" type="primary" @click="addDish">新增菜品</el-button>
    </div>
    <el-table :data="dishes" size="small" stripe empty-text="暂无菜品">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="菜名" min-width="140" />
      <el-table-column prop="price" label="价格" width="90">
        <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="分类" width="120">
        <template #default="{ row }">{{ categoryName(row.categoryId) }}</template>
      </el-table-column>
      <el-table-column label="上架" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.visible" @change="(v) => toggleDish(row, v)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="editDish(row)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="removeDish(row.id)">
            <template #reference><el-button link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchRestaurantCategories,
  createRestaurantCategory,
  updateRestaurantCategory,
  deleteRestaurantCategory,
  fetchRestaurantDishes,
  createRestaurantDish,
  updateRestaurantDish,
  deleteRestaurantDish
} from '@/api/admin'

const props = defineProps({
  restaurantId: {
    type: [Number, String],
    required: true
  }
})

const loading = ref(false)
const categories = ref([])
const dishes = ref([])

function categoryName(cid) {
  return categories.value.find((c) => c.id === cid)?.name || cid
}

async function loadData() {
  if (!props.restaurantId) return
  loading.value = true
  try {
    const [cats, dishList] = await Promise.all([
      fetchRestaurantCategories(props.restaurantId),
      fetchRestaurantDishes(props.restaurantId)
    ])
    categories.value = cats || []
    dishes.value = dishList || []
  } finally {
    loading.value = false
  }
}

async function addCategory() {
  const { value } = await ElMessageBox.prompt('分类名称', '新增分类')
  if (!value?.trim()) return
  await createRestaurantCategory(props.restaurantId, { name: value.trim() })
  categories.value = await fetchRestaurantCategories(props.restaurantId)
  ElMessage.success('已添加')
}

async function editCategory(row) {
  const { value } = await ElMessageBox.prompt('分类名称', '编辑分类', { inputValue: row.name })
  if (!value?.trim()) return
  await updateRestaurantCategory(props.restaurantId, row.id, { name: value.trim() })
  categories.value = await fetchRestaurantCategories(props.restaurantId)
  ElMessage.success('已更新')
}

async function removeCategory(categoryId) {
  await deleteRestaurantCategory(props.restaurantId, categoryId)
  categories.value = await fetchRestaurantCategories(props.restaurantId)
  ElMessage.success('已删除')
}

async function addDish() {
  if (!categories.value.length) {
    ElMessage.warning('请先添加分类')
    return
  }
  const { value: name } = await ElMessageBox.prompt('菜品名称', '新增菜品')
  if (!name?.trim()) return
  const { value: price } = await ElMessageBox.prompt('价格', '新增菜品', { inputValue: '0' })
  await createRestaurantDish(props.restaurantId, {
    name: name.trim(),
    price: Number(price) || 0,
    categoryId: categories.value[0].id
  })
  dishes.value = await fetchRestaurantDishes(props.restaurantId)
  ElMessage.success('已添加')
}

async function editDish(row) {
  const { value: name } = await ElMessageBox.prompt('菜品名称', '编辑菜品', { inputValue: row.name })
  if (!name?.trim()) return
  const { value: price } = await ElMessageBox.prompt('价格', '编辑菜品', { inputValue: String(row.price) })
  await updateRestaurantDish(props.restaurantId, row.id, { name: name.trim(), price: Number(price) || 0 })
  dishes.value = await fetchRestaurantDishes(props.restaurantId)
  ElMessage.success('已更新')
}

async function toggleDish(row, visible) {
  await updateRestaurantDish(props.restaurantId, row.id, { visible })
  row.visible = visible
}

async function removeDish(dishId) {
  await deleteRestaurantDish(props.restaurantId, dishId)
  dishes.value = await fetchRestaurantDishes(props.restaurantId)
  ElMessage.success('已删除')
}

watch(
  () => props.restaurantId,
  () => loadData(),
  { immediate: true }
)
</script>

<style scoped>
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.section-head h4 {
  margin: 0;
  font-size: 15px;
  color: #0f172a;
}
</style>
