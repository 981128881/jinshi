<template>
  <div class="page-card" v-loading="loading">
    <div class="page-header">
      <span class="page-header-title">订单详情</span>
      <el-button @click="goBack">返回列表</el-button>
    </div>

    <template v-if="current">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单号" :span="2">{{ current.id }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ current.userPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="ORDER_STATUS[current.status]?.type">{{ ORDER_STATUS[current.status]?.label }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款状态">
          <el-tag v-if="current.refundStatus" :type="REFUND_STATUS[current.refundStatus]?.type">
            {{ REFUND_STATUS[current.refundStatus]?.label }}
          </el-tag>
          <span v-else class="text-muted">无</span>
        </el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ current.totalAmount }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ current.createTime }}</el-descriptions-item>
        <el-descriptions-item label="订单备注" :span="2">{{ current.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="current.completedAt" label="完成时间">{{ current.completedAt }}</el-descriptions-item>
        <el-descriptions-item v-if="current.refundedAt" label="退款时间">{{ current.refundedAt }}</el-descriptions-item>
      </el-descriptions>

      <div class="section-title">商品明细</div>
      <el-table :data="current.items || []" size="small" stripe>
        <el-table-column prop="name" label="商品" min-width="160" />
        <el-table-column prop="price" label="单价" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
      </el-table>

      <div v-if="current.refunds?.length" class="section-block">
        <div class="section-title">退款记录</div>
        <el-table :data="current.refunds" size="small" stripe>
          <el-table-column prop="refundNo" label="退款单号" min-width="140" />
          <el-table-column prop="reason" label="原因" min-width="120" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">{{ REFUND_STATUS[row.status]?.label }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button v-if="row.status === 5" v-permission="PERMISSION.ORDER_RETRY_REFUND" link type="primary" @click="handleRetry(row.id)">重试</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="action-bar">
        <el-button v-if="current.status === 2" v-permission="PERMISSION.ORDER_SHIP" type="success" @click="shipOrder">确认发货</el-button>
        <el-button v-if="current.canRefund" v-permission="PERMISSION.ORDER_REFUND" type="danger" @click="openRefund">发起退款</el-button>
        <el-dropdown v-if="current.status < 4 && current.status !== 6" v-permission="PERMISSION.ORDER_STATUS" @command="changeStatus">
          <el-button type="primary">改状态</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="(item, key) in ORDER_STATUS" :key="key" :command="Number(key)">
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>

    <el-dialog v-model="refundVisible" title="订单退款" width="420px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="订单号">
          <span>{{ current?.id }}</span>
        </el-form-item>
        <el-form-item label="退款金额">
          <span>¥{{ current?.totalAmount }}</span>
        </el-form-item>
        <el-form-item label="退款原因" required>
          <el-input
            v-model="refundReason"
            type="textarea"
            :rows="3"
            maxlength="256"
            show-word-limit
            placeholder="请填写退款原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="danger" :loading="refunding" @click="submitRefund">确认退款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchOrderDetail, updateOrderStatus, refundOrder, retryRefund } from '@/api/admin'
import { ORDER_STATUS, REFUND_STATUS } from '@/constants/order'
import { PERMISSION } from '@/constants/permissions'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const current = ref(null)
const refundVisible = ref(false)
const refundReason = ref('')
const refunding = ref(false)

async function loadDetail() {
  loading.value = true
  try {
    current.value = await fetchOrderDetail(route.params.id)
  } catch (e) {
    ElMessage.error(e.message || '加载详情失败')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'Orders' })
}

function openRefund() {
  refundReason.value = ''
  refundVisible.value = true
}

async function submitRefund() {
  if (!refundReason.value.trim()) {
    ElMessage.warning('请填写退款原因')
    return
  }
  try {
    await ElMessageBox.confirm('确认对该订单发起全额退款？', '确认退款', { type: 'warning' })
  } catch {
    return
  }
  refunding.value = true
  try {
    await refundOrder(current.value.id, refundReason.value.trim())
    ElMessage.success('退款已提交')
    refundVisible.value = false
    await loadDetail()
  } catch (e) {
    ElMessage.error(e.message || '退款失败')
  } finally {
    refunding.value = false
  }
}

async function handleRetry(refundId) {
  try {
    await ElMessageBox.confirm('确认重试该退款？', '重试退款', { type: 'warning' })
  } catch {
    return
  }
  try {
    await retryRefund(refundId)
    ElMessage.success('重试已提交')
    await loadDetail()
  } catch (e) {
    ElMessage.error(e.message || '重试失败')
  }
}

async function changeStatus(status) {
  await updateOrderStatus(current.value.id, status)
  ElMessage.success('状态已更新')
  await loadDetail()
}

async function shipOrder() {
  await updateOrderStatus(current.value.id, 4)
  ElMessage.success('已发货，订单已完成')
  await loadDetail()
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
  color: #0f172a;
}
.section-title {
  margin: 20px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
}
.section-block {
  margin-top: 8px;
}
.action-bar {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.text-muted {
  color: #94a3b8;
}
</style>
