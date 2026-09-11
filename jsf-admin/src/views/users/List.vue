<template>
  <div class="page-card page-list">
    <div class="table-fill">
    <el-table :data="list" v-loading="loading" stripe height="100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="phone" label="手机号" width="140" />
    </el-table>
    </div>

    <AppPagination v-model:page="query.page" v-model:page-size="query.pageSize" :total="total" @change="loadData" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import AppPagination from '@/components/AppPagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { fetchUsers } from '@/api/admin'
import { isCancelled } from '@/api/request'
import { usePageRequest } from '@/composables/usePageRequest'

const { requestOptions } = usePageRequest()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE })

async function loadData() {
  loading.value = true
  try {
    const data = await fetchUsers(query, requestOptions({ cancelKey: 'users-list' }))
    list.value = data.list
    total.value = data.total
  } catch (e) {
    if (!isCancelled(e)) throw e
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
