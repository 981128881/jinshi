<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <h2 class="title">锦食坊运营后台</h2>
      <p class="subtitle">Vue 3 + Element Plus</p>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="管理员账号 / 店主手机号"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（店主默认=手机号）"
            :prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>
      <p class="hint">平台：admin / admin123 · 店主：手机号 / 手机号</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { User, Lock } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { isCancelled, isRequestError } from '@/api/request'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  await formRef.value.validate()
  loading.value = true
  try {
    await userStore.login(form)
    ElMessage.success('登录成功')
    router.replace(route.query.redirect || userStore.getHomePath())
  } catch (e) {
    if (!isCancelled(e) && !isRequestError(e)) {
      ElMessage.error(e?.message || '登录失败')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  userStore.syncFromStorage()
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
}

.login-card {
  width: 400px;
  padding: 12px 8px 8px;
}

.title {
  text-align: center;
  color: #0f172a;
  margin-bottom: 4px;
}

.subtitle {
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 28px;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}

.hint {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  margin-top: 16px;
}
</style>
