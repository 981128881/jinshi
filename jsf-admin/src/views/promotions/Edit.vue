<template>
  <div class="page-card">
    <div class="page-header">
      <span class="page-header-title">{{ isEdit ? '编辑活动' : '新增活动' }}</span>
      <el-button @click="goBack">返回列表</el-button>
    </div>

    <el-form ref="formRef" v-loading="loading" :model="form" :rules="rules" label-width="80px" class="edit-form">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="图片URL">
        <el-input v-model="form.imageUrl" />
      </el-form-item>
      <el-form-item label="开始日期">
        <el-input v-model="form.startTime" placeholder="2025-06-01" />
      </el-form-item>
      <el-form-item label="结束日期">
        <el-input v-model="form.endTime" placeholder="2025-12-31" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-form-item label="详情HTML">
        <el-input v-model="form.content" type="textarea" :rows="6" />
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
import { fetchPromotions, createPromotion, updatePromotion } from '@/api/admin'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({
  id: null, title: '', imageUrl: '', content: '', startTime: '', endTime: '', enabled: true
})
const rules = { title: [{ required: true, message: '请输入标题', trigger: 'blur' }] }

const isEdit = computed(() => !!route.params.id)

function goBack() {
  router.push({ name: 'Promotions' })
}

async function loadDetail() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const list = await fetchPromotions()
    const row = list.find((p) => String(p.id) === String(route.params.id))
    if (!row) {
      ElMessage.error('活动不存在')
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
    const payload = { ...form }
    delete payload.id
    if (isEdit.value) {
      await updatePromotion(form.id, payload)
    } else {
      await createPromotion(payload)
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
  max-width: 640px;
}
</style>
