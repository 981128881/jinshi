<template>
  <div class="amap-picker">
    <div class="search-row">
      <el-input
        v-model="keyword"
        clearable
        :maxlength="40"
        show-word-limit
        placeholder="搜索地点（如：齐齐哈尔火车站）"
        @keyup.enter="search"
      />
      <el-button type="primary" :disabled="!amapReady" @click="search">搜索</el-button>
    </div>
    <p v-if="!keyConfigured" class="amap-tip warn">
      未配置高德 Key：在 jsf-admin/.env.development 设置 VITE_AMAP_KEY（及可选 VITE_AMAP_SECURITY_CODE）后重启后台
    </p>
    <p v-else-if="loadError" class="amap-tip warn">{{ loadError }}</p>
    <div ref="mapEl" class="map" />
    <div class="picked">
      <span>已选：{{ address || '点击地图或搜索选点' }}</span>
      <span v-if="latitude && longitude" class="coords">{{ latitude.toFixed(6) }}, {{ longitude.toFixed(6) }}</span>
    </div>
    <ul v-if="tips.length" class="tips">
      <li v-for="(t, i) in tips" :key="i" @click="pickTip(t)">
        <strong>{{ t.name }}</strong>
        <span>{{ t.address || t.district || '' }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { loadAmap, getAmapKey } from '@/utils/amap'

const props = defineProps({
  address: { type: String, default: '' },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 }
})

const emit = defineEmits(['update:address', 'update:latitude', 'update:longitude', 'change'])

const mapEl = ref(null)
const keyword = ref('')
const tips = ref([])
const amapReady = ref(false)
const loadError = ref('')
const keyConfigured = !!getAmapKey()

let map = null
let marker = null
let placeSearch = null
let geocoder = null

function emitPick({ address, latitude, longitude }) {
  emit('update:address', String(address || '').slice(0, 100))
  emit('update:latitude', latitude)
  emit('update:longitude', longitude)
  emit('change', { address: String(address || '').slice(0, 100), latitude, longitude })
}

function setMarker(lng, lat) {
  if (!map || !window.AMap) return
  const pos = [lng, lat]
  if (!marker) {
    marker = new window.AMap.Marker({ position: pos, map })
  } else {
    marker.setPosition(pos)
  }
  map.setCenter(pos)
}

async function reverse(lng, lat) {
  if (!geocoder) return `${lng.toFixed(6)},${lat.toFixed(6)}`
  return new Promise((resolve) => {
    geocoder.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result?.regeocode?.formattedAddress) {
        resolve(result.regeocode.formattedAddress)
      } else {
        resolve(`${lng.toFixed(6)},${lat.toFixed(6)}`)
      }
    })
  })
}

async function onMapClick(e) {
  const lng = e.lnglat.getLng()
  const lat = e.lnglat.getLat()
  setMarker(lng, lat)
  const address = await reverse(lng, lat)
  emitPick({ address, latitude: lat, longitude: lng })
}

function pickTip(t) {
  const loc = t.location
  if (!loc) return
  const lng = typeof loc.lng === 'number' ? loc.lng : Number(loc.split?.(',')?.[0])
  const lat = typeof loc.lat === 'number' ? loc.lat : Number(loc.split?.(',')?.[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
  setMarker(lng, lat)
  const address = t.address ? `${t.district || ''}${t.address}${t.name}` : t.name
  emitPick({ address: address || t.name, latitude: lat, longitude: lng })
  tips.value = []
  keyword.value = t.name
}

function search() {
  const kw = keyword.value.trim()
  if (!kw || !placeSearch) return
  placeSearch.search(kw, (status, result) => {
    if (status !== 'complete' || !result?.poiList?.pois?.length) {
      tips.value = []
      return
    }
    tips.value = result.poiList.pois.slice(0, 8)
  })
}

async function init() {
  if (!keyConfigured || !mapEl.value) return
  try {
    const AMap = await loadAmap()
    const center =
      props.longitude && props.latitude
        ? [props.longitude, props.latitude]
        : [123.92, 47.35] // 齐齐哈尔大致中心
    map = new AMap.Map(mapEl.value, {
      zoom: props.longitude && props.latitude ? 16 : 12,
      center,
      viewMode: '2D'
    })
    map.on('click', onMapClick)
    placeSearch = new AMap.PlaceSearch({ city: '齐齐哈尔', citylimit: false })
    geocoder = new AMap.Geocoder({ city: '全国' })
    if (props.longitude && props.latitude) {
      setMarker(props.longitude, props.latitude)
    }
    amapReady.value = true
  } catch (e) {
    loadError.value = e.message || '地图初始化失败'
  }
}

watch(
  () => [props.latitude, props.longitude],
  ([lat, lng]) => {
    if (amapReady.value && lat && lng) setMarker(lng, lat)
  }
)

onMounted(init)
onBeforeUnmount(() => {
  if (map) {
    map.destroy()
    map = null
  }
})
</script>

<style scoped>
.amap-picker {
  width: 100%;
}
.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.map {
  width: 100%;
  height: 280px;
  border-radius: 10px;
  overflow: hidden;
  background: #eef2f6;
  border: 1px solid var(--el-border-color);
}
.picked {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
  color: #475569;
}
.coords {
  color: #94a3b8;
  font-family: ui-monospace, monospace;
}
.tips {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  max-height: 180px;
  overflow: auto;
}
.tips li {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-bottom: 1px solid #f1f5f9;
}
.tips li:last-child {
  border-bottom: none;
}
.tips li:hover {
  background: #f8fafc;
}
.tips strong {
  font-size: 13px;
  color: #0f172a;
}
.tips span {
  font-size: 12px;
  color: #64748b;
}
.amap-tip {
  margin: 0 0 8px;
  font-size: 12px;
  color: #64748b;
}
.amap-tip.warn {
  color: #b45309;
}
</style>
