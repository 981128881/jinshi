<template>
  <el-pagination
    v-model:current-page="currentPage"
    v-model:page-size="currentPageSize"
    :page-sizes="PAGE_SIZES"
    :total="total"
    background
    :layout="PAGINATION_LAYOUT"
    class="app-pagination"
    @size-change="handleSizeChange"
    @current-change="handleCurrentChange"
  />
</template>

<script setup>
import { PAGE_SIZES, PAGINATION_LAYOUT } from '@/constants/pagination'

defineProps({
  total: { type: Number, default: 0 }
})

const currentPage = defineModel('page', { type: Number, default: 1 })
const currentPageSize = defineModel('pageSize', { type: Number, default: 20 })

const emit = defineEmits(['change'])

function handleSizeChange() {
  currentPage.value = 1
  emit('change')
}

function handleCurrentChange() {
  emit('change')
}
</script>

<style scoped>
.app-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
