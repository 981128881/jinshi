<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px">
        <el-option v-for="(item, key) in ORDER_STATUS" :key="key" :label="item.label" :value="Number(key)" />
      </el-select>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <div class="table-fill">
    <el-table :data="list" v-loading="loading" stripe height="100%">
      <el-table-column prop="id" label="订单号" min-width="160" />
      <el-table-column prop="userPhone" label="联系电话" width="130" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="ORDER_STATUS[row.status]?.type">{{ ORDER_STATUS[row.status]?.label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="totalAmount" label="金额" width="100">
        <template #default="{ row }">¥{{ row.totalAmount }}</template>
      </el-table-column>
      <el-table-column prop="createTime" label="下单时间" width="170" />
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row.id)">详情</el-button>
          <el-button v-if="row.status === 2" v-permission="PERMISSION.ORDER_SHIP" link type="success" @click="shipOrder(row.id)">发货</el-button>
          <el-dropdown v-if="row.status < 4 && row.status !== 6" v-permission="PERMISSION.ORDER_STATUS" @command="(s) => changeStatus(row.id, s)">
            <el-button link type="primary">改状态</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="(item, key) in ORDER_STATUS" :key="key" :command="Number(key)">
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
    </div>

    <AppPagination v-model:page="query.page" v-model:page-size="query.pageSize" :total="total" @change="loadData" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppPagination from '@/components/AppPagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { fetchOrders, updateOrderStatus } from '@/api/admin'
import { ORDER_STATUS } from '@/constants/order'
import { PERMISSION } from '@/constants/permissions'
import { openAdminPage } from '@/utils/openPage'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ status: null, page: 1, pageSize: DEFAULT_PAGE_SIZE })

async function loadData() {
  loading.value = true
  try {
    const data = await fetchOrders(query)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function search() {
  query.page = 1
  loadData()
}

function reset() {
  query.status = null
  query.page = 1
  loadData()
}

function goDetail(id) {
  openAdminPage({ name: 'OrderDetail', params: { id } })
}

async function changeStatus(id, status) {
  await updateOrderStatus(id, status)
  ElMessage.success('状态已更新')
  loadData()
}

async function shipOrder(id) {
  await updateOrderStatus(id, 4)
  ElMessage.success('已发货，订单已完成')
  loadData()
}

onMounted(loadData)
</script>
