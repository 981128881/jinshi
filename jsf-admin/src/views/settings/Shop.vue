<template>
  <div class="page-card">
    <el-form ref="formRef" :model="form" label-width="140px" style="max-width: 560px" v-loading="loading">
      <el-divider content-position="left">商家信息</el-divider>
      <el-form-item label="商家名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="纬度">
        <el-input-number v-model="form.latitude" :precision="6" :step="0.001" style="width: 100%" />
      </el-form-item>
      <el-form-item label="经度">
        <el-input-number v-model="form.longitude" :precision="6" :step="0.001" style="width: 100%" />
      </el-form-item>
      <el-form-item label="配送半径(km)">
        <el-input-number v-model="form.deliveryRadiusKm" :min="0" :precision="1" style="width: 100%" />
      </el-form-item>
      <el-form-item label="客服电话">
        <el-input v-model="form.servicePhone" />
      </el-form-item>

      <el-divider content-position="left">小程序首页展示</el-divider>
      <el-form-item label="显示轮播图">
        <el-switch v-model="form.showBannerSection" />
      </el-form-item>
      <el-form-item label="显示分类入口">
        <el-switch v-model="form.showCategorySection" />
      </el-form-item>
      <el-form-item label="显示限时秒杀">
        <el-switch v-model="form.showFlashSaleSection" />
      </el-form-item>
      <el-form-item label="显示新鲜推荐">
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
  latitude: 0,
  longitude: 0,
  deliveryRadiusKm: 5,
  servicePhone: '',
  showBannerSection: true,
  showCategorySection: true,
  showFlashSaleSection: true,
  showRecommendSection: true
})

async function loadData() {
  loading.value = true
  try {
    const data = await fetchShopConfig()
    Object.assign(form, {
      showBannerSection: true,
      showCategorySection: true,
      showFlashSaleSection: true,
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

<style scoped>
.form-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
</style>
