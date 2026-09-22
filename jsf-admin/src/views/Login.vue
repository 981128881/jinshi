<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <img class="brand-logo" src="/logo.png" alt="" />
      <h2 class="title">金石菜牌齐市店</h2>
      <p class="subtitle">运营后台</p>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="账号"
            :prefix-icon="User"
            size="large"
            maxlength="32"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            maxlength="32"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>
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
    await userStore.login({
      username: String(form.username || '').trim(),
      password: String(form.password || '')
    })
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

.brand-logo {
  display: block;
  width: 72px;
  height: 72px;
  margin: 0 auto 12px;
  border-radius: 12px;
  object-fit: cover;
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
</style>
