<template>
  <div class="page-card">
    <div class="page-header">
      <span class="page-header-title">{{ isEdit ? '编辑轮播' : '新增轮播' }}</span>
      <el-button @click="goBack">返回列表</el-button>
    </div>

    <el-form ref="formRef" v-loading="loading" :model="form" :rules="rules" label-width="80px" class="edit-form">
      <el-form-item label="图片" prop="imageUrl" required>
        <el-image v-if="form.imageUrl" :src="form.imageUrl" style="width: 240px; height: 80px; margin-bottom: 8px" fit="cover" />
        <el-upload :show-file-list="false" accept="image/*" :http-request="handleUpload">
          <el-button type="primary" plain :loading="uploading">上传图片</el-button>
        </el-upload>
        <el-input v-model="form.imageUrl" maxlength="512" placeholder="或粘贴图片 URL" style="margin-top: 8px" />
      </el-form-item>
      <el-form-item label="标题">
        <el-input v-model="form.title" :maxlength="30" show-word-limit placeholder="选填" />
      </el-form-item>
      <el-form-item label="链接">
        <el-input v-model="form.link" :maxlength="200" show-word-limit placeholder="选填" />
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
import { fetchBanners, createBanner, updateBanner, uploadBannerImage } from '@/api/admin'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const formRef = ref()
const form = reactive({ id: null, imageUrl: '', title: '', link: '' })
const rules = { imageUrl: [{ required: true, message: '请输入图片地址', trigger: 'blur' }] }

const isEdit = computed(() => !!route.params.id)

async function handleUpload({ file }) {
  uploading.value = true
  try {
    const result = await uploadBannerImage(file)
    form.imageUrl = result.path || result.url || ''
    ElMessage.success('上传成功')
  } finally {
    uploading.value = false
  }
}

function goBack() {
  router.push('/banners')
}

async function loadDetail() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const list = await fetchBanners()
    const row = list.find((b) => String(b.id) === String(route.params.id))
    if (!row) {
      ElMessage.error('轮播不存在')
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
      imageUrl: form.imageUrl,
      title: String(form.title || '').trim().slice(0, 30),
      link: String(form.link || '').trim().slice(0, 200)
    }
    if (isEdit.value) {
      await updateBanner(form.id, payload)
    } else {
      await createBanner(payload)
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
  max-width: 560px;
}
</style>
