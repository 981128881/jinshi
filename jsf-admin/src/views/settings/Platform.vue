<template>
  <div class="page-card">
    <el-form ref="formRef" :model="form" label-width="140px" style="max-width: 560px" v-loading="loading">
      <el-divider content-position="left">平台信息</el-divider>
      <el-form-item label="平台名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="客服电话">
        <el-input v-model="form.servicePhone" />
      </el-form-item>

      <el-divider content-position="left">小程序首页展示</el-divider>
      <el-form-item label="显示轮播图">
        <el-switch v-model="form.showBannerSection" />
      </el-form-item>
      <el-form-item label="显示品类入口">
        <el-switch v-model="form.showCategorySection" />
      </el-form-item>
      <el-form-item label="显示推荐餐厅">
        <el-switch v-model="form.showRecommendSection" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchShopConfig, updateShopConfig } from '@/api/admin'

const loading = ref(false)
const saving = ref(false)
const form = reactive({
  name: '',
  servicePhone: '',
  showBannerSection: true,
  showCategorySection: true,
  showRecommendSection: true
})

async function loadData() {
  loading.value = true
  try {
    const data = await fetchShopConfig()
    Object.assign(form, {
      showBannerSection: true,
      showCategorySection: true,
      showRecommendSection: true,
      ...data
    })
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await updateShopConfig({ ...form })
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>
