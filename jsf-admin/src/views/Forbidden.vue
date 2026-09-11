<template>
  <div class="forbidden-page">
    <el-result icon="warning" title="无访问权限" sub-title="当前账号没有该页面或操作的权限，请联系超级管理员。">
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goLogin">重新登录</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirm'

const router = useRouter()
const userStore = useUserStore()

function goHome() {
  router.replace(userStore.getHomePath())
}

async function goLogin() {
  if (!(await confirmAction('确定退出并重新登录？', '重新登录', '退出'))) return
  userStore.logout()
}
</script>

<style scoped>
.forbidden-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
