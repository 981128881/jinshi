<template>
  <div class="page-card detail-page" v-loading="loading">
    <div class="detail-head">
      <div>
        <el-button @click="$router.push('/restaurants')">返回列表</el-button>
        <div class="title-row">
          <h2 class="title">{{ form.name || '餐厅详情' }}</h2>
          <el-tag v-if="form.code" size="small">{{ form.code }}</el-tag>
          <el-tag :type="form.effectivelyOpen ? 'success' : 'info'" size="small">
            {{ form.effectivelyOpen ? '营业中' : '打烊' }}
          </el-tag>
        </div>
        <p v-if="form.address" class="sub">{{ form.address }}</p>
      </div>
      <div class="head-actions">
        <el-switch v-model="form.open" active-text="手动营业" inactive-text="强制打烊" @change="saveOpen" />
        <el-select
          v-if="isPlatformAdmin"
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
      <div class="side-col">
        <div class="section-title" style="margin-top: 0">门店形象</div>
        <div class="detail-cover">
          <el-image v-if="form.coverImage" :src="form.coverImage" fit="cover">
            <template #error><div class="cover-empty">封面加载失败</div></template>
          </el-image>
          <div v-else class="cover-empty">暂无封面</div>
        </div>
        <div class="media-actions">
          <el-upload :show-file-list="false" accept="image/*" :http-request="uploadCover">
            <el-button size="small" :loading="uploadingCover">
              {{ form.coverImage ? '更换封面' : '上传封面' }}
            </el-button>
          </el-upload>
          <el-upload :show-file-list="false" accept="image/*" :http-request="uploadLogo">
            <el-button size="small" :loading="uploadingLogo">
              {{ form.logo ? '更换 Logo' : '上传 Logo' }}
            </el-button>
          </el-upload>
        </div>
        <div v-if="form.logo" class="logo-row">
          <el-image :src="form.logo" fit="cover" class="logo-preview">
            <template #error><span /></template>
          </el-image>
          <span>Logo 预览</span>
        </div>

        <div class="section-title">资质证件</div>
        <p class="hours-tip license-tip">上传后不可自行修改；如需更换请联系平台管理员。</p>
        <div class="license-grid">
          <div
            v-for="item in licenseItems"
            :key="item.field"
            class="gallery-item license-card"
          >
            <el-image
              v-if="form[item.field]"
              :src="form[item.field]"
              :preview-src-list="[form[item.field]]"
              fit="cover"
            />
            <el-upload
              v-else-if="canUploadLicense(item.field)"
              class="license-uploader"
              :show-file-list="false"
              accept="image/*"
              :http-request="(opt) => uploadLicense(item.field, opt)"
            >
              <div class="license-empty" v-loading="uploadingLicense[item.field]">
                <span class="license-plus">+</span>
                <span>未上传</span>
              </div>
            </el-upload>
            <div v-else class="license-empty is-disabled">
              <span>未上传</span>
            </div>
            <div class="cap">{{ item.label }}</div>
            <div v-if="form[item.field]" class="license-actions">
              <el-upload
                v-if="isPlatformAdmin"
                :show-file-list="false"
                accept="image/*"
                :http-request="(opt) => uploadLicense(item.field, opt)"
              >
                <el-button size="small" :loading="uploadingLicense[item.field]">重新上传</el-button>
              </el-upload>
              <el-button
                v-if="isPlatformAdmin"
                size="small"
                type="danger"
                plain
                :loading="clearingLicense[item.field]"
                @click="clearLicense(item.field)"
              >
                删除
              </el-button>
              <span v-if="!isPlatformAdmin" class="locked-hint">已锁定</span>
            </div>
          </div>
        </div>
      </div>

      <el-form :model="form" label-width="96px" class="detail-form">
        <div class="section-title" style="margin-top: 0">基本信息</div>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="门店ID"><el-input v-model="form.code" disabled /></el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="名称" required>
              <el-input v-model="form.name" :maxlength="32" show-word-limit placeholder="门店名称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="品类">
              <el-select v-model="form.cuisineTypeId" clearable placeholder="选择品类" style="width: 100%">
                <el-option v-for="c in cuisineTypes" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="电话" required>
              <el-input
                v-model="form.phone"
                placeholder="11 位手机号（后台登录账号）"
                :maxlength="11"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="营业时间">
              <div class="hours-row">
                <el-time-select
                  v-model="form.openTime"
                  start="00:00"
                  step="00:30"
                  end="23:30"
                  placeholder="开始"
                  clearable
                  style="width: 140px"
                />
                <span class="hours-sep">至</span>
                <el-time-select
                  v-model="form.closeTime"
                  start="00:00"
                  step="00:30"
                  end="23:30"
                  placeholder="结束"
                  clearable
                  style="width: 140px"
                />
              </div>
              <div class="hours-tip">留空表示不限时段；可跨零点。实际营业 = 手动开关开 且 在时段内。</div>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="section-title">地址与简介</div>
        <el-form-item label="地图选点">
          <AmapPlacePicker
            v-model:address="form.address"
            v-model:latitude="form.latitude"
            v-model:longitude="form.longitude"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :xs="24" :md="12">
            <el-form-item label="地址" required>
              <el-input
                v-model="form.address"
                type="textarea"
                :rows="3"
                :maxlength="100"
                show-word-limit
                placeholder="可地图选点后微调文字"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="简介">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                :maxlength="200"
                show-word-limit
                placeholder="选填"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="section-title">登录账号</div>
        <el-form-item label="后台密码">
          <div class="pwd-row">
            <el-input
              v-model="adminPassword"
              type="password"
              show-password
              :maxlength="32"
              placeholder="至少 6 位，不改可留空"
              style="flex: 1; max-width: 360px"
            />
            <el-button :loading="savingPwd" @click="savePassword">设置密码</el-button>
            <el-button link type="primary" @click="resetPasswordToPhone">重置为手机号</el-button>
          </div>
          <div class="hours-tip">登录账号为门店电话；入驻通过后默认密码也是手机号。</div>
        </el-form-item>

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
import { ElMessage, ElMessageBox } from 'element-plus'
import AmapPlacePicker from '@/components/AmapPlacePicker.vue'
import { useUserStore } from '@/stores/user'
import {
  fetchRestaurant,
  updateRestaurant,
  updateRestaurantOpen,
  updateRestaurantStatus,
  updateRestaurantPassword,
  fetchCuisineTypes,
  fetchRestaurantWxaCode,
  uploadShopImage
} from '@/api/admin'

const route = useRoute()
const userStore = useUserStore()
const id = computed(() => route.params.id)
const isPlatformAdmin = computed(() => !userStore.isOrgAdmin)
const loading = ref(false)
const saving = ref(false)
const savingPwd = ref(false)
const uploadingLogo = ref(false)
const uploadingCover = ref(false)
const uploadingLicense = reactive({ licenseImage: false, foodSafetyLicenseImage: false })
const clearingLicense = reactive({ licenseImage: false, foodSafetyLicenseImage: false })
const qrVisible = ref(false)
const qrLoading = ref(false)
const qrUrl = ref('')
const adminPassword = ref('')
const cuisineTypes = ref([])

const licenseItems = [
  { field: 'licenseImage', label: '营业执照' },
  { field: 'foodSafetyLicenseImage', label: '食品安全许可证' }
]

const form = reactive({
  code: '',
  name: '',
  cuisineTypeId: null,
  phone: '',
  address: '',
  latitude: 0,
  longitude: 0,
  description: '',
  logo: '',
  coverImage: '',
  licenseImage: '',
  foodSafetyLicenseImage: '',
  open: true,
  openTime: '',
  closeTime: '',
  effectivelyOpen: true,
  status: 'approved'
})

function canUploadLicense(field) {
  return isPlatformAdmin.value || !form[field]
}

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
      latitude: Number(detail.latitude) || 0,
      longitude: Number(detail.longitude) || 0,
      description: detail.description,
      logo: detail.logo,
      coverImage: detail.coverImage,
      licenseImage: detail.licenseImage || '',
      foodSafetyLicenseImage: detail.foodSafetyLicenseImage || '',
      open: detail.open,
      openTime: detail.openTime || '',
      closeTime: detail.closeTime || '',
      effectivelyOpen: detail.effectivelyOpen ?? detail.open,
      status: detail.status
    })
    cuisineTypes.value = cuisines || []
  } finally {
    loading.value = false
  }
}

async function saveInfo() {
  const name = String(form.name || '').trim().slice(0, 32)
  const phone = String(form.phone || '').trim().slice(0, 11)
  const address = String(form.address || '').trim().slice(0, 100)
  const description = String(form.description || '').trim().slice(0, 200)
  if (!name) {
    ElMessage.warning('请填写门店名称')
    return
  }
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请填写正确的11位手机号')
    return
  }
  if (!address) {
    ElMessage.warning('请填写地址')
    return
  }
  form.name = name
  form.phone = phone
  form.address = address
  form.description = description
  saving.value = true
  try {
    const data = await updateRestaurant(id.value, {
      name,
      cuisineTypeId: form.cuisineTypeId,
      phone,
      address,
      latitude: form.latitude,
      longitude: form.longitude,
      description,
      logo: form.logo,
      coverImage: form.coverImage,
      openTime: form.openTime || '',
      closeTime: form.closeTime || ''
    })
    form.effectivelyOpen = data?.effectivelyOpen ?? form.effectivelyOpen
    form.openTime = data?.openTime ?? form.openTime
    form.closeTime = data?.closeTime ?? form.closeTime
    form.logo = data?.logo ?? form.logo
    form.coverImage = data?.coverImage ?? form.coverImage
    ElMessage.success('已保存')
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  const pwd = adminPassword.value.trim()
  if (pwd.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  savingPwd.value = true
  try {
    const data = await updateRestaurantPassword(id.value, pwd)
    adminPassword.value = ''
    ElMessage.success(`已设置，账号 ${data?.username || form.phone}`)
  } finally {
    savingPwd.value = false
  }
}

async function resetPasswordToPhone() {
  const phone = String(form.phone || '').trim()
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请先保存有效手机号')
    return
  }
  adminPassword.value = phone
  await savePassword()
}

function pickUploadUrl(result) {
  return result?.url || result?.path || ''
}

async function uploadLogo({ file }) {
  uploadingLogo.value = true
  try {
    const result = await uploadShopImage(file)
    const url = pickUploadUrl(result)
    if (!url) throw new Error('上传失败')
    form.logo = url
    ElMessage.success('Logo 已上传，请保存资料')
  } finally {
    uploadingLogo.value = false
  }
}

async function uploadCover({ file }) {
  uploadingCover.value = true
  try {
    const result = await uploadShopImage(file)
    const url = pickUploadUrl(result)
    if (!url) throw new Error('上传失败')
    form.coverImage = url
    ElMessage.success('封面已上传，请保存资料')
  } finally {
    uploadingCover.value = false
  }
}

async function uploadLicense(field, { file }) {
  if (!canUploadLicense(field)) {
    ElMessage.warning('已上传，仅平台管理员可重新上传')
    return
  }
  uploadingLicense[field] = true
  try {
    const result = await uploadShopImage(file)
    const url = pickUploadUrl(result)
    if (!url) throw new Error('上传失败')
    const data = await updateRestaurant(id.value, { [field]: url })
    form[field] = data?.[field] || url
    ElMessage.success('已上传并保存')
  } finally {
    uploadingLicense[field] = false
  }
}

async function clearLicense(field) {
  if (!isPlatformAdmin.value) return
  try {
    await ElMessageBox.confirm('确认删除该证件？删除后门店可重新上传。', '删除证件', {
      type: 'warning'
    })
  } catch {
    return
  }
  clearingLicense[field] = true
  try {
    const data = await updateRestaurant(id.value, { [field]: '' })
    form[field] = data?.[field] || ''
    ElMessage.success('已删除')
  } finally {
    clearingLicense[field] = false
  }
}

async function saveOpen(open) {
  await updateRestaurantOpen(id.value, open)
  try {
    const detail = await fetchRestaurant(id.value)
    form.open = detail.open
    form.effectivelyOpen = detail.effectivelyOpen ?? open
  } catch (e) {
    form.effectivelyOpen = open
  }
  ElMessage.success(open ? '已设为手动营业' : '已强制打烊')
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
.side-col {
  min-width: 0;
}
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
.media-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.detail-form {
  min-width: 0;
  width: 100%;
}
.hours-row,
.pwd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-wrap: wrap;
}
.hours-sep {
  color: #64748b;
}
.hours-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}
.license-tip {
  margin: -4px 0 10px;
}
.license-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 520px) {
  .license-grid {
    grid-template-columns: 1fr;
  }
}
.license-uploader {
  display: block;
  width: 100%;
}
.license-uploader :deep(.el-upload) {
  display: block;
  width: 100%;
}
.license-empty {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  background: #f8fafc;
  transition: background 0.15s;
}
.license-empty:hover:not(.is-disabled) {
  background: #f1f5f9;
}
.license-empty.is-disabled {
  cursor: default;
}
.license-plus {
  font-size: 28px;
  line-height: 1;
  color: #94a3b8;
  font-weight: 300;
}
.license-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 0 12px 10px;
}
.locked-hint {
  font-size: 12px;
  color: #94a3b8;
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
