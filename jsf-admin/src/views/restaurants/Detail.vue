<template>
  <div class="page-card detail-page" v-loading="loading">
    <div class="detail-head">
      <div>
        <el-button @click="$router.push('/restaurants')">返回列表</el-button>
        <div class="title-row">
          <h2 class="title">{{ form.name || '餐厅详情' }}</h2>
          <el-tag v-if="form.code" size="small">{{ form.code }}</el-tag>
          <el-tag :type="form.open ? 'success' : 'info'" size="small">{{ form.open ? '营业中' : '打烊' }}</el-tag>
        </div>
        <p v-if="form.address" class="sub">{{ form.address }}</p>
      </div>
      <div class="head-actions">
        <el-switch v-model="form.open" active-text="营业中" inactive-text="打烊" @change="saveOpen" />
        <el-select
          v-model="form.status"
          style="width: 120px"
          @change="saveStatus"
        >
          <el-option label="已通过" value="approved" />
          <el-option label="已停用" value="disabled" />
          <el-option label="待审" value="pending" />
        </el-select>
        <el-button type="primary" plain :loading="qrLoading" @click="openQr">店铺码</el-button>
      </div>
    </div>

    <div class="detail-grid">
          <div>
            <div class="detail-cover">
              <el-image v-if="form.coverImage" :src="form.coverImage" fit="cover">
                <template #error><div class="cover-empty">封面加载失败</div></template>
              </el-image>
              <div v-else class="cover-empty">暂无封面</div>
            </div>
            <div v-if="form.logo" class="logo-row">
              <el-image :src="form.logo" fit="cover" class="logo-preview">
                <template #error><span /></template>
              </el-image>
              <span>Logo</span>
            </div>
          </div>
          <el-form :model="form" label-width="88px" class="detail-form">
            <el-form-item label="门店ID"><el-input v-model="form.code" disabled /></el-form-item>
            <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="品类">
              <el-select v-model="form.cuisineTypeId" clearable placeholder="选择品类" style="width: 100%">
                <el-option v-for="c in cuisineTypes" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
            <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
            <el-form-item label="简介"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="Logo URL"><el-input v-model="form.logo" /></el-form-item>
            <el-form-item label="封面 URL"><el-input v-model="form.coverImage" /></el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveInfo">保存资料</el-button>
              <el-button @click="$router.push({ path: '/menus', query: { restaurantId: id } })">
                去菜单管理
              </el-button>
            </el-form-item>
          </el-form>
        </div>

    <el-dialog v-model="qrVisible" title="店铺码" width="420px" append-to-body>
      <div class="qr-box" v-loading="qrLoading">
        <img v-if="qrUrl" class="qr-img" :src="qrUrl" alt="店铺码" />
        <p class="qr-tip">顾客微信扫码即可打开本店，可下载后打印贴在店内</p>
      </div>
      <template #footer>
        <el-button @click="qrVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!qrUrl" @click="saveQr">下载图片</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  fetchRestaurant,
  updateRestaurant,
  updateRestaurantOpen,
  updateRestaurantStatus,
  fetchCuisineTypes,
  fetchRestaurantWxaCode
} from '@/api/admin'

const route = useRoute()
const id = computed(() => route.params.id)
const loading = ref(false)
const saving = ref(false)
const qrVisible = ref(false)
const qrLoading = ref(false)
const qrUrl = ref('')
const cuisineTypes = ref([])

const form = reactive({
  code: '',
  name: '',
  cuisineTypeId: null,
  phone: '',
  address: '',
  description: '',
  logo: '',
  coverImage: '',
  open: true,
  status: 'approved'
})

async function loadAll() {
  loading.value = true
  try {
    const [detail, cuisines] = await Promise.all([fetchRestaurant(id.value), fetchCuisineTypes()])
    Object.assign(form, {
      code: detail.code || '',
      name: detail.name,
      cuisineTypeId: detail.cuisineTypeId,
      phone: detail.phone,
      address: detail.address,
      description: detail.description,
      logo: detail.logo,
      coverImage: detail.coverImage,
      open: detail.open,
      status: detail.status
    })
    cuisineTypes.value = cuisines || []
  } finally {
    loading.value = false
  }
}

async function saveInfo() {
  saving.value = true
  try {
    await updateRestaurant(id.value, { ...form })
    ElMessage.success('已保存')
  } finally {
    saving.value = false
  }
}

async function saveOpen(open) {
  await updateRestaurantOpen(id.value, open)
  ElMessage.success(open ? '已设为营业' : '已打烊')
}

async function saveStatus(status) {
  await updateRestaurantStatus(id.value, status)
  ElMessage.success('状态已更新')
}

async function openQr() {
  qrVisible.value = true
  qrLoading.value = true
  try {
    const data = await fetchRestaurantWxaCode(id.value)
    qrUrl.value = data?.imageUrl || ''
  } catch (e) {
    qrVisible.value = false
  } finally {
    qrLoading.value = false
  }
}

async function saveQr() {
  if (!qrUrl.value) return
  const res = await fetch(qrUrl.value)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `${form.name || '店铺'}-小程序码.png`
  a.click()
  URL.revokeObjectURL(blobUrl)
}

onMounted(async () => {
  await loadAll()
  if (route.query.wxacode) openQr()
})
</script>

<style scoped>
.logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
}
.logo-preview {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: #f1f5f9;
}
.detail-form {
  max-width: 640px;
}
.qr-box {
  text-align: center;
  min-height: 200px;
}
.qr-img {
  width: 240px;
  height: 240px;
}
.qr-tip {
  margin: 12px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
