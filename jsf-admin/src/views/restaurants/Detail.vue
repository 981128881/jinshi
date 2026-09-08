<template>
  <div class="page-card" v-loading="loading">
    <div class="toolbar">
      <div>
        <el-button v-if="!userStore.isOrgAdmin" @click="$router.push('/restaurants')">返回列表</el-button>
        <el-button type="primary" plain :loading="qrLoading" @click="openQr">店铺码</el-button>
      </div>
      <div>
        <el-switch v-model="form.open" active-text="营业中" inactive-text="打烊" @change="saveOpen" />
        <el-select
          v-if="!userStore.isOrgAdmin"
          v-model="form.status"
          style="width: 120px"
          @change="saveStatus"
        >
          <el-option label="已通过" value="approved" />
          <el-option label="已停用" value="disabled" />
          <el-option label="待审" value="pending" />
        </el-select>
      </div>
    </div>

    <el-tabs v-model="tab">
      <el-tab-pane label="基本信息" name="info">
        <el-form :model="form" label-width="100px" style="max-width: 640px">
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
            <el-button @click="$router.push({ path: '/menus', query: userStore.isOrgAdmin ? {} : { restaurantId: id } })">
              去菜单管理
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane :label="userStore.isOrgAdmin ? '登录账号' : '商家 App 账号'" name="app">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
          :title="
            userStore.isOrgAdmin
              ? '此账号同时用于运营后台与商家 App：用户名=手机号，默认密码=手机号。'
              : '每个店主独立账号：默认用户名=手机号，默认密码=手机号。入驻审核通过时自动开通。'
          "
        />
        <el-form :model="appForm" label-width="100px" style="max-width: 480px">
          <el-form-item label="账号">
            <el-input v-model="appForm.username" :disabled="userStore.isOrgAdmin" placeholder="默认使用餐厅手机号" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="appForm.password"
              type="password"
              show-password
              :placeholder="appAccount ? '留空则不修改' : '留空则默认=手机号'"
            />
          </el-form-item>
          <el-form-item v-if="!userStore.isOrgAdmin" label="启用"><el-switch v-model="appForm.enabled" /></el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="appSaving" @click="saveAppAccount">保存账号</el-button>
            <el-button v-if="!userStore.isOrgAdmin" :loading="appSaving" @click="autoCreateAppAccount">按手机号开通</el-button>
            <el-button v-if="appAccount" :loading="appSaving" @click="resetAppPassword">重置为手机号密码</el-button>
            <el-popconfirm
              v-if="appAccount && !userStore.isOrgAdmin"
              title="确认删除账号？"
              @confirm="removeAppAccount"
            >
              <template #reference>
                <el-button type="danger" plain>删除账号</el-button>
              </template>
            </el-popconfirm>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

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
import { useUserStore } from '@/stores/user'
import {
  fetchRestaurant,
  updateRestaurant,
  updateRestaurantOpen,
  updateRestaurantStatus,
  saveRestaurantAppAccount,
  ensureRestaurantAppAccount,
  resetRestaurantAppPassword,
  deleteRestaurantAppAccount,
  fetchCuisineTypes,
  fetchRestaurantWxaCode
} from '@/api/admin'

const route = useRoute()
const userStore = useUserStore()
const id = computed(() => route.params.id)
const loading = ref(false)
const saving = ref(false)
const appSaving = ref(false)
const qrVisible = ref(false)
const qrLoading = ref(false)
const qrUrl = ref('')
const tab = ref('info')
const cuisineTypes = ref([])
const appAccount = ref(null)

const form = reactive({
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

const appForm = reactive({ username: '', password: '', enabled: true })

async function loadAll() {
  loading.value = true
  try {
    const [detail, cuisines] = await Promise.all([fetchRestaurant(id.value), fetchCuisineTypes()])
    Object.assign(form, {
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
    appAccount.value = detail.appAccount || null
    appForm.username = detail.appAccount?.username || ''
    appForm.enabled = detail.appAccount?.enabled !== false
    appForm.password = ''
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

async function saveAppAccount() {
  appSaving.value = true
  try {
    const payload = { username: appForm.username, enabled: appForm.enabled }
    if (appForm.password) payload.password = appForm.password
    if (!appAccount.value && !appForm.password && !appForm.username) {
      appAccount.value = await ensureRestaurantAppAccount(id.value)
    } else if (!appAccount.value && !appForm.password && appForm.username) {
      appAccount.value = await saveRestaurantAppAccount(id.value, {
        username: appForm.username,
        enabled: appForm.enabled
      })
    } else {
      appAccount.value = await saveRestaurantAppAccount(id.value, payload)
    }
    appForm.username = appAccount.value.username || appForm.username
    appForm.password = ''
    ElMessage.success(appAccount.value.defaultPasswordHint || 'App 账号已保存')
  } finally {
    appSaving.value = false
  }
}

async function autoCreateAppAccount() {
  appSaving.value = true
  try {
    appAccount.value = await ensureRestaurantAppAccount(id.value)
    appForm.username = appAccount.value.username || ''
    appForm.enabled = appAccount.value.enabled !== false
    appForm.password = ''
    ElMessage.success(appAccount.value.defaultPasswordHint || '已按手机号开通')
  } finally {
    appSaving.value = false
  }
}

async function resetAppPassword() {
  appSaving.value = true
  try {
    appAccount.value = await resetRestaurantAppPassword(id.value)
    appForm.username = appAccount.value.username || appForm.username
    appForm.password = ''
    ElMessage.success(appAccount.value.defaultPasswordHint || '密码已重置为手机号')
  } finally {
    appSaving.value = false
  }
}

async function removeAppAccount() {
  await deleteRestaurantAppAccount(id.value)
  appAccount.value = null
  appForm.username = ''
  appForm.password = ''
  ElMessage.success('已删除')
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
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar > div {
  display: flex;
  align-items: center;
  gap: 12px;
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
