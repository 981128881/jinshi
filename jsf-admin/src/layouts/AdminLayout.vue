<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <img class="logo-img" src="/logo.png" alt="" />
        <span>金石菜牌齐市店</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#0f172a"
        text-color="#94a3b8"
        active-text-color="#38bdf8"
      >
        <template v-for="item in visibleMenus" :key="item.path || item.title">
          <el-sub-menu v-if="item.children?.length" :index="item.title">
            <template #title>
              <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
            >
              {{ child.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="(item, index) in breadcrumbs"
              :key="index"
              :to="item.path ? { path: item.path } : undefined"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-tag :type="notifyConnected ? 'success' : 'info'" size="small" effect="plain">
            {{ notifyConnected ? '新单轮询中' : '未登录' }}
          </el-tag>
          <el-tag v-if="permissionStore.isSuper" type="warning" size="small" effect="plain">超级管理员</el-tag>
          <span class="username">{{ userStore.displayName }}</span>
          <el-button type="danger" link @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>

    <el-dialog
      :model-value="!!currentAlert"
      :title="currentAlert?.title || '预约提醒'"
      width="440px"
      align-center
      :close-on-click-modal="false"
      append-to-body
      class="reservation-alert-dialog"
      @update:model-value="onAlertModel"
    >
      <p v-if="currentAlert?.tip" class="alert-tip">{{ currentAlert.tip }}</p>
      <dl v-if="currentAlert?.order" class="alert-order">
        <div><dt>单号</dt><dd>{{ currentAlert.order.id }}</dd></div>
        <div><dt>当日序号</dt><dd>#{{ currentAlert.order.dailyNo || '—' }}</dd></div>
        <div><dt>门店</dt><dd>{{ currentAlert.order.restaurantName || '—' }}</dd></div>
        <div><dt>联系人</dt><dd>{{ currentAlert.order.contactName || '—' }}</dd></div>
        <div><dt>电话</dt><dd>{{ currentAlert.order.contactPhone || '—' }}</dd></div>
        <div><dt>预约时间</dt><dd>{{ formatAlertTime(currentAlert.order.reserveAt) }}</dd></div>
        <div><dt>金额</dt><dd>¥{{ currentAlert.order.totalAmount ?? 0 }}</dd></div>
        <div v-if="currentAlert.order.remark"><dt>备注</dt><dd>{{ currentAlert.order.remark }}</dd></div>
      </dl>
      <template #footer>
        <el-button type="primary" @click="viewAlertOrder">查看</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { useMerchantNotify } from '@/composables/useMerchantNotify'
import { MENU_ITEMS } from '@/router/menu'
import { confirmAction } from '@/utils/confirm'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const { connected: notifyConnected, currentAlert, dismissAlert, acknowledgeView } = useMerchantNotify()

function onAlertModel(v) {
  if (!v) dismissAlert()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatAlertTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function viewAlertOrder() {
  const id = currentAlert.value?.order?.id
  if (id) acknowledgeView(id)
  dismissAlert()
  if (id) router.push(`/reservations/${encodeURIComponent(String(id))}`)
}

const visibleMenus = computed(() => {
  return MENU_ITEMS.filter((item) => permissionStore.canAccessMenu(item)).map((item) => {
    if (!item.children?.length) return item
    return {
      ...item,
      children: item.children.filter((child) => permissionStore.canAccessMenu(child))
    }
  })
})

const activeMenu = computed(() => {
  if (route.path.startsWith('/restaurants')) return '/restaurants'
  if (route.path.startsWith('/menus/dishes')) return '/menus/dishes'
  if (route.path.startsWith('/menus')) return '/menus/categories'
  if (route.path.startsWith('/cuisine-types')) return '/cuisine-types'
  if (route.path.startsWith('/reservations')) return '/reservations'
  if (route.path.startsWith('/banners')) return '/banners'
  if (route.path.startsWith('/onboarding')) return '/onboarding'
  if (route.path.startsWith('/system')) return route.path
  if (route.path.startsWith('/settings')) return route.path
  return route.path
})

const breadcrumbs = computed(() => {
  const items = [{ title: '首页', path: userStore.getHomePath() }]
  const parents = route.meta.breadcrumb || []
  parents.forEach((item) => {
    items.push({ title: item.title, path: item.path || '' })
  })
  const title = route.meta.title
  if (title && title !== '首页') {
    const last = items[items.length - 1]
    if (!last || last.title !== title) {
      items.push({ title, path: '' })
    }
  }
  return items
})

async function handleLogout() {
  if (!(await confirmAction('确定退出登录？', '退出登录', '退出'))) return
  userStore.logout()
}

onMounted(() => {
  userStore.fetchProfile().catch(() => {})
})
</script>

<style scoped>
.layout {
  height: 100vh;
}

.layout > .el-container {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.main-container {
  flex-direction: column;
}

.aside {
  background: #0f172a;
}

.logo {
  height: 64px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  border-bottom: 1px solid #1e293b;
}
.logo-img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  height: 60px;
  padding: 0 20px;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.header-left :deep(.el-breadcrumb__inner) {
  font-weight: 500;
}

.header-left :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #0f172a;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  color: #64748b;
  font-size: 14px;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #f1f5f9;
  padding: 12px;
  overflow: hidden;
}

.main > .page-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.main > .page-card.page-list {
  overflow: hidden;
}

.alert-tip {
  margin: 0 0 12px;
  color: #b45309;
  font-size: 14px;
}

.alert-order {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-order > div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.alert-order dt {
  margin: 0;
  color: #64748b;
}

.alert-order dd {
  margin: 0;
  color: #0f172a;
  word-break: break-all;
}
</style>
