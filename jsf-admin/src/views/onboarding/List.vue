<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-radio-group v-model="status" @change="load">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="submitted">待审</el-radio-button>
          <el-radio-button label="approved">已通过</el-radio-button>
          <el-radio-button label="rejected">已驳回</el-radio-button>
        </el-radio-group>
        <el-button @click="load">刷新</el-button>
      </div>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="restaurantName" label="门店" min-width="140" />
        <el-table-column prop="contactName" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="电话" width="130" />
        <el-table-column prop="status" label="状态" width="110" />
        <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="['submitted', 'reviewing'].includes(row.status)"
              link
              type="success"
              @click="approve(row)"
            >通过</el-button>
            <el-button
              v-if="['submitted', 'reviewing'].includes(row.status)"
              link
              type="danger"
              @click="reject(row)"
            >驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawer" title="入驻详情" size="40%">
      <template v-if="current">
        <p><b>门店</b>：{{ current.restaurantName }}</p>
        <p><b>联系人</b>：{{ current.contactName }} {{ current.contactPhone }}</p>
        <p><b>法人</b>：{{ current.legalPerson || '-' }}</p>
        <p><b>执照号</b>：{{ current.licenseNo || '-' }}</p>
        <p><b>地址</b>：{{ current.address }}</p>
        <p><b>状态</b>：{{ current.status }}</p>
        <p v-if="current.rejectReason"><b>驳回原因</b>：{{ current.rejectReason }}</p>
        <div class="imgs">
          <el-image v-if="current.licenseImage" :src="current.licenseImage" fit="cover" style="width:120px;height:120px" />
          <el-image v-if="current.doorImage" :src="current.doorImage" fit="cover" style="width:120px;height:120px" />
          <el-image v-if="current.insideImage" :src="current.insideImage" fit="cover" style="width:120px;height:120px" />
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { get, post } from '@/api/request'

const status = ref('submitted')
const list = ref([])
const loading = ref(false)
const drawer = ref(false)
const current = ref(null)

async function load() {
  loading.value = true
  try {
    const params = { page: 1, pageSize: 50 }
    if (status.value) params.status = status.value
    const data = await get('/admin/onboarding', params)
    list.value = data?.list || []
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  current.value = await get(`/admin/onboarding/${row.id}`)
  drawer.value = true
}

async function approve(row) {
  await ElMessageBox.confirm(`确认通过「${row.restaurantName}」？`, '审核通过')
  await post(`/admin/onboarding/${row.id}/approve`, {})
  ElMessage.success('已通过')
  load()
}

async function reject(row) {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', {
    inputPattern: /.+/,
    inputErrorMessage: '原因必填'
  })
  await post(`/admin/onboarding/${row.id}/reject`, { reason: value })
  ElMessage.success('已驳回')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 16px; }
.imgs { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
</style>
