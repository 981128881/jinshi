<template>
  <div class="menu-editor" v-loading="loading">
    <div v-if="pane === 'categories'" class="menu-pane">
      <div class="section-head">
        <h4>分类</h4>
        <el-button size="small" type="primary" @click="addCategory">新增分类</el-button>
      </div>
      <div class="table-fill">
        <el-table :data="pagedCats" stripe empty-text="暂无分类" height="100%">
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
              <el-button link type="danger" @click="removeCategory(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <AppPagination v-model:page="catPage" v-model:page-size="catPageSize" :total="catTotal" />
    </div>

    <div v-if="pane === 'dishes'" class="menu-pane">
      <div class="section-head">
        <h4>菜品</h4>
        <el-button size="small" type="primary" @click="addDish">新增菜品</el-button>
      </div>
      <div class="table-fill">
        <el-table :data="pagedDishes" stripe empty-text="暂无菜品" height="100%">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column label="主图" width="72">
            <template #default="{ row }">
              <el-image v-if="row.image" :src="resolveDishImage(row.image)" fit="cover" class="dish-thumb" />
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="菜名" min-width="140" />
          <el-table-column prop="price" label="价格" width="90">
            <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="sales" label="销量" width="80">
            <template #default="{ row }">{{ Number(row.sales) || 0 }}</template>
          </el-table-column>
          <el-table-column label="分类" width="120">
            <template #default="{ row }">{{ categoryName(row.categoryId) }}</template>
          </el-table-column>
          <el-table-column label="标签" min-width="160">
            <template #default="{ row }">
              <el-tag v-for="t in (row.tags || [])" :key="t" size="small" class="dish-tag">{{ t }}</el-tag>
              <span v-if="!(row.tags || []).length" class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="上架" width="80">
            <template #default="{ row }">
              <el-switch :model-value="row.visible" @change="(v) => toggleDish(row, v)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button link type="primary" @click="editDish(row)">编辑</el-button>
              <el-button link type="danger" @click="removeDish(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <AppPagination v-model:page="dishPage" v-model:page-size="dishPageSize" :total="dishTotal" />
    </div>

    <el-dialog v-model="dishDialog" :title="editingDishId ? '编辑菜品' : '新增菜品'" width="480px" destroy-on-close>
      <el-form label-width="72px">
        <el-form-item label="名称">
          <el-input v-model="dishForm.name" maxlength="64" />
        </el-form-item>
        <el-form-item label="主图">
          <div class="dish-image-row">
            <el-image v-if="dishForm.image" :src="resolveDishImage(dishForm.image)" fit="cover" class="dish-thumb-lg" />
            <el-upload :show-file-list="false" accept="image/*" :http-request="handleUploadDishImage">
              <el-button :loading="uploading">{{ dishForm.image ? '更换' : '上传' }}</el-button>
            </el-upload>
            <el-button v-if="dishForm.image" @click="dishForm.image = ''">清除</el-button>
          </div>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number
            v-model="dishForm.price"
            :min="0"
            :precision="2"
            :controls="false"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="销量">
          <el-input-number v-model="dishForm.sales" :min="0" :precision="0" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="dishForm.categoryId" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="dishForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="本店特色、五星推荐…"
            style="width: 100%"
          >
            <el-option v-for="t in DISH_TAG_PRESETS" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="dishForm.desc" type="textarea" :rows="2" maxlength="120" show-word-limit placeholder="小程序菜名下方展示，可留空" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dishDialog = false">取消</el-button>
        <el-button type="primary" :loading="dishSaving" @click="saveDish">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { confirmAction } from '@/utils/confirm'
import {
  fetchRestaurantCategories,
  createRestaurantCategory,
  updateRestaurantCategory,
  deleteRestaurantCategory,
  fetchRestaurantDishes,
  createRestaurantDish,
  updateRestaurantDish,
  deleteRestaurantDish,
  uploadDishImage
} from '@/api/admin'
import AppPagination from '@/components/AppPagination.vue'
import { useClientPager } from '@/composables/useClientPager'
import appConfig from '@/config/index.js'

const props = defineProps({
  restaurantId: {
    type: [Number, String],
    required: true
  },
  pane: {
    type: String,
    default: 'categories'
  }
})

const loading = ref(false)
const categories = ref([])
const dishes = ref([])
const { page: catPage, pageSize: catPageSize, total: catTotal, paged: pagedCats } = useClientPager(categories)
const { page: dishPage, pageSize: dishPageSize, total: dishTotal, paged: pagedDishes } = useClientPager(dishes)
const DISH_TAG_PRESETS = ['本店特色', '五星推荐']
const dishDialog = ref(false)
const dishSaving = ref(false)
const uploading = ref(false)
const editingDishId = ref(null)
const dishForm = reactive({ name: '', price: 0, categoryId: null, tags: [], desc: '', image: '', sales: 0 })

function resolveDishImage(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const base = (appConfig.fileBaseUrl || '').replace(/\/$/, '')
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path
}

function asTags(v) {
  if (Array.isArray(v)) return v.filter(Boolean).map(String)
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []
    } catch {
      return []
    }
  }
  return []
}

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
    dishes.value = (dishList || []).map((d) => ({ ...d, tags: asTags(d.tags) }))
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
  if (!(await confirmAction('确定删除该分类？', '删除确认', '删除'))) return
  await deleteRestaurantCategory(props.restaurantId, categoryId)
  categories.value = await fetchRestaurantCategories(props.restaurantId)
  ElMessage.success('已删除')
}

async function addDish() {
  if (!categories.value.length) {
    ElMessage.warning('请先添加分类')
    return
  }
  editingDishId.value = null
  Object.assign(dishForm, {
    name: '',
    price: 0,
    categoryId: categories.value[0].id,
    tags: [],
    desc: '',
    image: '',
    sales: 0
  })
  dishDialog.value = true
}

async function editDish(row) {
  editingDishId.value = row.id
  Object.assign(dishForm, {
    name: row.name,
    price: row.price,
    categoryId: row.categoryId,
    tags: asTags(row.tags),
    desc: row.desc || '',
    image: row.image || '',
    sales: Number(row.sales) || 0
  })
  dishDialog.value = true
}

async function handleUploadDishImage({ file }) {
  uploading.value = true
  try {
    const result = await uploadDishImage(file)
    dishForm.image = result.path || result.url || ''
    ElMessage.success('上传成功')
  } finally {
    uploading.value = false
  }
}

async function saveDish() {
  if (!dishForm.name?.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  if (dishForm.price == null || !Number.isFinite(Number(dishForm.price)) || Number(dishForm.price) < 0) {
    ElMessage.warning('请输入有效价格')
    return
  }
  dishSaving.value = true
  try {
    const payload = {
      name: dishForm.name.trim(),
      price: Number(dishForm.price),
      categoryId: dishForm.categoryId,
      tags: asTags(dishForm.tags),
      desc: (dishForm.desc || '').trim(),
      image: dishForm.image || '',
      sales: Math.max(0, Math.floor(Number(dishForm.sales) || 0))
    }
    if (editingDishId.value) {
      await updateRestaurantDish(props.restaurantId, editingDishId.value, payload)
    } else {
      await createRestaurantDish(props.restaurantId, payload)
    }
    dishes.value = (await fetchRestaurantDishes(props.restaurantId) || []).map((d) => ({ ...d, tags: asTags(d.tags) }))
    dishDialog.value = false
    ElMessage.success('已保存')
  } finally {
    dishSaving.value = false
  }
}

async function toggleDish(row, visible) {
  await updateRestaurantDish(props.restaurantId, row.id, { visible })
  row.visible = visible
}

async function removeDish(dishId) {
  if (!(await confirmAction('确定删除该菜品？', '删除确认', '删除'))) return
  await deleteRestaurantDish(props.restaurantId, dishId)
  dishes.value = (await fetchRestaurantDishes(props.restaurantId) || []).map((d) => ({ ...d, tags: asTags(d.tags) }))
  ElMessage.success('已删除')
}

watch(
  () => props.restaurantId,
  () => loadData(),
  { immediate: true }
)
</script>

<style scoped>
.menu-editor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.menu-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.section-head h4 {
  margin: 0;
  font-size: 15px;
  color: #0f172a;
}
.dish-tag {
  margin-right: 4px;
}
.muted {
  color: #94a3b8;
}
.dish-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}
.dish-thumb-lg {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
}
.dish-image-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
