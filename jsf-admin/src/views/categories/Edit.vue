<template>
  <div class="page-card">
    <div class="page-header">
      <span class="page-header-title">{{ isEdit ? '编辑分类' : '新增分类' }}</span>
      <el-button @click="goBack">返回列表</el-button>
    </div>

    <el-form ref="formRef" v-loading="loading" :model="form" :rules="rules" label-width="72px" class="edit-form">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入分类名称" />
      </el-form-item>
      <el-form-item label="预览">
        <div class="icon-preview large" :style="{ background: form.iconBg || '#f5f5f5' }">
          <img v-if="form.iconImage" :src="resolveIconUrl(form.iconImage)" alt="" />
          <span v-else class="preview-placeholder">{{ form.name?.charAt(0) || '?' }}</span>
        </div>
      </el-form-item>
      <el-form-item label="上传">
        <el-upload :show-file-list="false" accept="image/*" :http-request="handleUploadIcon">
          <el-button type="primary" plain :loading="uploading">选择图片</el-button>
        </el-upload>
        <div v-if="form.iconImage" class="upload-tip">已上传，保存后生效</div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchCategories, createCategory, updateCategory, uploadCategoryIcon } from '@/api/admin'
import appConfig from '@/config/index.js'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const formRef = ref()
const form = reactive({ id: null, name: '', icon: '', iconImage: '', iconBg: '#F5F5F5' })
const rules = { name: [{ required: true, message: '请输入名称', trigger: 'blur' }] }

const isEdit = computed(() => !!route.params.id)

function resolveIconUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const base = (appConfig.fileBaseUrl || '').replace(/\/$/, '')
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path
}

function goBack() {
  router.push({ name: 'Categories' })
}

async function handleUploadIcon({ file }) {
  uploading.value = true
  try {
    const result = await uploadCategoryIcon(file)
    form.iconImage = result.path || result.url || ''
    ElMessage.success('上传成功')
  } finally {
    uploading.value = false
  }
}

async function loadDetail() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const list = await fetchCategories()
    const row = list.find((c) => String(c.id) === String(route.params.id))
    if (!row) {
      ElMessage.error('分类不存在')
      goBack()
      return
    }
    Object.assign(form, { ...row })
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      name: form.name,
      icon: form.icon,
      iconImage: form.iconImage,
      iconBg: form.iconBg || '#F5F5F5'
    }
    if (isEdit.value) {
      await updateCategory(form.id, payload)
    } else {
      await createCategory(payload)
    }
    ElMessage.success('保存成功')
    goBack()
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-header-title {
  font-size: 18px;
  font-weight: 600;
}
.edit-form {
  max-width: 520px;
}
.icon-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.icon-preview.large {
  width: 104px;
  height: 104px;
}
.icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-placeholder {
  font-size: 36px;
  color: #999;
  font-weight: 600;
}
.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
