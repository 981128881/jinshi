<template>
  <div class="page-card">
    <p class="tip">每行一个热搜词，或使用下方输入框添加</p>
    <el-select
      v-model="keywords"
      multiple
      filterable
      allow-create
      default-first-option
      placeholder="输入后回车添加"
      style="width: 100%; max-width: 560px"
    />
    <div style="margin-top: 20px">
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchHotKeywords, updateHotKeywords } from '@/api/admin'

const keywords = ref([])
const saving = ref(false)

async function loadData() {
  keywords.value = await fetchHotKeywords()
}

async function handleSave() {
  saving.value = true
  try {
    await updateHotKeywords(keywords.value)
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.tip {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 16px;
}
</style>
