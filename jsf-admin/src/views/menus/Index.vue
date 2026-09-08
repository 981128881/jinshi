<template>
  <div class="page-card" v-loading="booting">
    <div class="toolbar">
      <div class="toolbar-left">
        <h3 class="page-title">菜单管理</h3>
        <span v-if="restaurantName" class="restaurant-name">{{ restaurantName }}</span>
      </div>
      <el-select
        v-if="!userStore.isOrgAdmin"
        v-model="restaurantId"
        filterable
        placeholder="选择餐厅"
        style="width: 260px"
      >
        <el-option v-for="r in restaurants" :key="r.id" :label="r.name" :value="r.id" />
      </el-select>
    </div>

    <el-empty v-if="!restaurantId && !booting" description="请先选择餐厅" />
    <MenuEditor v-else-if="restaurantId" :restaurant-id="restaurantId" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { fetchRestaurants, fetchRestaurant } from '@/api/admin'
import MenuEditor from './MenuEditor.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const booting = ref(true)
const restaurantId = ref(null)
const restaurantName = ref('')
const restaurants = ref([])

async function resolveRestaurant() {
  booting.value = true
  try {
    if (userStore.isOrgAdmin) {
      restaurantId.value = userStore.restaurantId
      restaurantName.value = userStore.restaurantName || ''
      if (restaurantId.value) {
        try {
          const detail = await fetchRestaurant(restaurantId.value)
          restaurantName.value = detail.name || restaurantName.value
        } catch {
          /* ignore */
        }
      }
      return
    }

    const data = await fetchRestaurants({ page: 1, pageSize: 200, status: 'approved' })
    restaurants.value = data.list || []
    const fromQuery = route.query.restaurantId ? Number(route.query.restaurantId) : null
    if (fromQuery && restaurants.value.some((r) => r.id === fromQuery)) {
      restaurantId.value = fromQuery
    } else if (restaurants.value.length === 1) {
      restaurantId.value = restaurants.value[0].id
    }
    syncName()
  } finally {
    booting.value = false
  }
}

function syncName() {
  const row = restaurants.value.find((r) => r.id === restaurantId.value)
  restaurantName.value = row?.name || ''
}

watch(restaurantId, (id) => {
  if (userStore.isOrgAdmin) return
  syncName()
  if (id) {
    router.replace({ query: { ...route.query, restaurantId: String(id) } })
  }
})

onMounted(resolveRestaurant)
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.page-title {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}
.restaurant-name {
  color: #94a3b8;
  font-size: 13px;
}
</style>
