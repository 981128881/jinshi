<template>
  <div class="page-card detail-page" v-loading="loading">
    <div class="detail-head">
      <div>
        <el-button @click="$router.push('/onboarding')">返回列表</el-button>
        <div v-if="current" class="title-row">
          <h2 class="title">{{ current.restaurantName || current.contactName || '入驻详情' }}</h2>
          <el-tag v-if="current.restaurantCode" size="small">{{ current.restaurantCode }}</el-tag>
          <el-tag size="small" :type="statusType(current.status)">{{ statusLabel(current.status) }}</el-tag>
        </div>
        <p v-if="current?.address" class="sub">{{ current.address }}</p>
      </div>
      <div class="head-actions">
        <el-button
          v-if="canReview"
          type="success"
          @click="approve"
        >通过</el-button>
        <el-button
          v-if="canReview"
          type="danger"
          plain
          @click="reject"
        >驳回</el-button>
        <el-button
          v-if="current?.restaurantId"
          @click="$router.push(`/restaurants/${current.restaurantId}`)"
        >查看门店</el-button>
      </div>
    </div>

    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" style="margin-bottom: 16px" />

    <template v-if="current">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="门店ID">{{ current.restaurantCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusType(current.status)">{{ statusLabel(current.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="联系人">{{ current.contactName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ current.contactPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="法人">{{ current.legalPerson || '-' }}</el-descriptions-item>
        <el-descriptions-item label="执照号">{{ current.licenseNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ current.userNickname || '-' }} {{ current.userPhone }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ formatTime(current.submittedAt) }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ current.address || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="current.rejectReason" label="驳回原因" :span="2">
          {{ current.rejectReason }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="section-title">资质照片</div>
      <div v-if="photos.length" class="gallery">
        <div v-for="item in photos" :key="item.label" class="gallery-item">
          <el-image :src="item.url" :preview-src-list="previewList" fit="cover" />
          <div class="cap">{{ item.label }}</div>
        </div>
      </div>
      <div v-else class="cover-empty" style="min-height: 80px; border-radius: 12px; background: #f8fafc">暂无照片</div>

      <template v-if="(current.auditLogs || []).length">
        <div class="section-title">审核记录</div>
        <el-timeline>
          <el-timeline-item
            v-for="log in current.auditLogs"
            :key="log.id"
            :timestamp="formatTime(log.createdAt)"
            placement="top"
          >
            {{ log.adminName || '系统' }} · {{ log.action === 'approve' ? '通过' : log.action === 'reject' ? '驳回' : log.action }}
            <span v-if="log.remark"> — {{ log.remark }}</span>
          </el-timeline-item>
        </el-timeline>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { get, post } from '@/api/request'

const STATUS = {
  submitted: { label: '待审', type: 'warning' },
  reviewing: { label: '审核中', type: '' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
}

const route = useRoute()
const loading = ref(false)
const current = ref(null)
const error = ref('')

const id = computed(() => Number(route.params.id))
const canReview = computed(() => ['submitted', 'reviewing'].includes(current.value?.status))
const photos = computed(() => {
  const row = current.value
  if (!row) return []
  return [
    { label: '营业执照', url: row.licenseImage },
    { label: '门头照', url: row.doorImage },
    { label: '店内照', url: row.insideImage }
  ].filter((x) => x.url)
})
const previewList = computed(() => photos.value.map((x) => x.url))

function statusLabel(s) {
  return STATUS[s]?.label || s || '-'
}

function statusType(s) {
  return STATUS[s]?.type || 'info'
}

function formatTime(v) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 19)
}

async function load() {
  if (!id.value) {
    error.value = '缺少申请编号'
    return
  }
  loading.value = true
  error.value = ''
  try {
    current.value = await get(`/admin/onboarding/${id.value}`)
  } catch (e) {
    current.value = null
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function approve() {
  await ElMessageBox.confirm(`确认通过「${current.value.restaurantName || current.value.contactName}」？`, '审核通过')
  await post(`/admin/onboarding/${id.value}/approve`, {})
  ElMessage.success('已通过')
  load()
}

async function reject() {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', {
    inputPattern: /.+/,
    inputErrorMessage: '原因必填'
  })
  await post(`/admin/onboarding/${id.value}/reject`, { reason: value })
  ElMessage.success('已驳回')
  load()
}

watch(id, () => load())
onMounted(load)
</script>
