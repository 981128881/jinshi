<template>
  <div class="page-card product-edit">
    <div class="page-header">
      <span class="page-header-title">{{ isEdit ? '编辑商品' : '新增商品' }}</span>
    </div>

    <el-form
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="edit-form"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入商品名称" />
      </el-form-item>
      <el-form-item label="分类" prop="categoryId">
        <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="售价" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="原价">
            <el-input-number v-model="form.originalPrice" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="销量">
            <el-input-number v-model="form.sales" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="库存" prop="stock">
            <el-input-number v-model="form.stock" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="商品图片">
        <div class="image-upload">
          <div v-if="form.image" class="image-preview-wrap">
            <el-image :src="imagePreview" fit="cover" class="image-preview" />
            <div class="image-actions">
              <el-upload
                :show-file-list="false"
                accept="image/*"
                :http-request="handleUploadImage"
              >
                <el-button size="small" :loading="uploading">更换图片</el-button>
              </el-upload>
              <el-button size="small" @click="clearImage">删除</el-button>
            </div>
          </div>
          <el-upload
            v-else
            class="image-uploader"
            :show-file-list="false"
            accept="image/*"
            :http-request="handleUploadImage"
          >
            <div class="upload-placeholder" v-loading="uploading">
              <span class="upload-icon">+</span>
              <span class="upload-text">上传主图</span>
            </div>
          </el-upload>
          <div class="upload-hint">支持 JPG、PNG、WEBP，上传后自动压缩优化（最长边 1200px）</div>
        </div>
      </el-form-item>
      <el-form-item label="标签">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入后回车添加标签"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="商品详情" class="desc-form-item">
        <RichTextEditor v-model="form.desc" height="calc(100vh - 520px)" />
      </el-form-item>
      <el-form-item label="小程序展示">
        <el-switch v-model="form.visible" />
      </el-form-item>
      <el-form-item label="精品推荐">
        <el-switch v-model="form.featured" />
        <span class="form-tip">开启后显示在小程序该分类「精品推荐」区域</span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { confirmAction } from '@/utils/confirm'
import RichTextEditor from '@/components/RichTextEditor.vue'
import appConfig from '@/config/index.js'
import {
  fetchCategories,
  fetchProduct,
  createProduct,
  updateProduct,
  uploadProductImage
} from '@/api/admin'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const categories = ref([])
const formRef = ref()

const productId = computed(() => {
  if (route.name !== 'ProductEdit') return null
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})
const isEdit = computed(() => route.name === 'ProductEdit')

const imagePreview = computed(() => resolveImageUrl(form.image))

function resolveImageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const base = (appConfig.fileBaseUrl || '').replace(/\/$/, '')
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path
}

async function handleUploadImage({ file }) {
  uploading.value = true
  try {
    const result = await uploadProductImage(file)
    form.image = result.path || result.url || ''
    ElMessage.success('上传成功')
  } finally {
    uploading.value = false
  }
}

async function clearImage() {
  if (!(await confirmAction('确定删除该图片？', '删除确认', '删除'))) return
  form.image = ''
}

const form = reactive({
  id: null,
  name: '',
  categoryId: null,
  price: 0,
  originalPrice: 0,
  image: '',
  sales: 0,
  stock: 999,
  tags: [],
  desc: '',
  visible: true,
  featured: false
})

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入售价', trigger: 'blur' }]
}

function resetForm() {
  Object.assign(form, {
    id: null,
    name: '',
    categoryId: categories.value[0]?.id || null,
    price: 0,
    originalPrice: 0,
    image: '',
    sales: 0,
    stock: 999,
    tags: [],
    desc: '',
    visible: true,
    featured: false
  })
}

function goBack() {
  router.push({ name: 'Products' })
}

async function loadProduct() {
  if (!isEdit.value) {
    resetForm()
    return
  }
  loading.value = true
  try {
    const data = await fetchProduct(productId.value)
    Object.assign(form, {
      ...data,
      tags: [...(data.tags || [])],
      visible: data.visible !== false,
      featured: !!data.featured
    })
  } catch (e) {
    ElMessage.error('商品不存在或加载失败')
    goBack()
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = { ...form }
    delete payload.id
    if (isEdit.value) {
      await updateProduct(productId.value, payload)
    } else {
      await createProduct(payload)
    }
    ElMessage.success('保存成功')
    goBack()
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  categories.value = await fetchCategories()
  await loadProduct()
})

watch(() => route.fullPath, () => {
  loadProduct()
})
</script>

<style scoped>
.product-edit {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.page-header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.edit-form {
  flex: 1;
  padding-top: 8px;
  width: 100%;
}

.edit-form :deep(.el-form-item__content) {
  max-width: none;
}

.desc-form-item :deep(.el-form-item__content) {
  width: 100%;
}

.desc-form-item :deep(.rich-text-editor) {
  width: 100%;
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.image-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-preview-wrap {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.image-preview {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.image-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.image-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.upload-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
  background: #fafafa;
}

.upload-icon {
  font-size: 28px;
  line-height: 1;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 13px;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}
</style>
