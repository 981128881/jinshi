<template>
  <div class="page-card page-list">
    <div class="toolbar">
      <div class="toolbar-title">管理员账号</div>
      <el-button v-permission="PERMISSION.ADMIN_CREATE" type="primary" @click="openCreate">新增管理员</el-button>
    </div>

    <div class="table-fill">
    <el-table :data="paged" v-loading="loading" stripe height="100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="nickname" label="昵称" width="140" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.isSuper ? 'warning' : 'info'" size="small">
            {{ row.isSuper ? '超级管理员' : '普通管理员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'danger'" size="small">
            {{ row.enabled ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="权限数" width="100">
        <template #default="{ row }">{{ row.isSuper ? '全部' : row.permissions?.length || 0 }}</template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" min-width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="[PERMISSION.ADMIN_EDIT, PERMISSION.ADMIN_PERMISSION]"
            link
            type="primary"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="!row.isSuper"
            v-permission="PERMISSION.ADMIN_DELETE"
            link
            type="danger"
            @click="handleDelete(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    </div>
    <AppPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑管理员' : '新增管理员'"
      width="720px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            :disabled="!!editingId"
            :maxlength="32"
            show-word-limit
            placeholder="登录用户名"
          />
        </el-form-item>
        <el-form-item :label="editingId ? '新密码' : '密码'" :prop="editingId ? '' : 'password'">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :maxlength="32"
            :placeholder="editingId ? '不修改请留空' : '至少 6 位'"
          />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" :maxlength="10" show-word-limit placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="超级管理员">
          <el-switch v-model="form.isSuper" :disabled="editingSelfSuper" />
          <span class="form-tip">超级管理员拥有全部菜单和按钮权限</span>
        </el-form-item>
        <el-form-item v-if="!form.isSuper" label="菜单与按钮">
          <div class="perm-panel">
            <div class="perm-actions">
              <el-button size="small" link type="primary" @click="checkAllPermissions">全选</el-button>
              <el-button size="small" link @click="clearPermissions">清空</el-button>
            </div>
            <el-tree
              ref="treeRef"
              :data="permissionTree"
              node-key="code"
              show-checkbox
              default-expand-all
              :props="{ label: 'name', children: 'children' }"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { confirmAction } from '@/utils/confirm'
import { PERMISSION } from '@/constants/permissions'
import {
  fetchAdminUsers,
  fetchPermissionTree,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
} from '@/api/admin'
import { useUserStore } from '@/stores/user'
import AppPagination from '@/components/AppPagination.vue'
import { useClientPager } from '@/composables/useClientPager'

const userStore = useUserStore()
const loading = ref(false)
const saving = ref(false)
const list = ref([])
const { page, pageSize, total, paged } = useClientPager(list)
const permissionTree = ref([])
const dialogVisible = ref(false)
const editingId = ref(null)
const formRef = ref()
const treeRef = ref()

const form = reactive({
  username: '',
  password: '',
  nickname: '',
  enabled: true,
  isSuper: false
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { max: 32, message: '最多32个字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '至少 6 位', trigger: 'blur' },
    { max: 32, message: '最多32位', trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 10, message: '最多10个字', trigger: 'blur' }
  ]
}

const editingSelfSuper = computed(() => {
  const row = list.value.find((item) => item.id === editingId.value)
  return row?.isSuper && row?.username === userStore.username
})

function formatTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function flattenTree(nodes, codes = []) {
  nodes.forEach((node) => {
    codes.push(node.code)
    if (node.children?.length) flattenTree(node.children, codes)
  })
  return codes
}

async function loadData() {
  loading.value = true
  try {
    const data = await fetchAdminUsers()
    list.value = data.list || []
  } finally {
    loading.value = false
  }
}

async function loadPermissionTree() {
  permissionTree.value = await fetchPermissionTree()
}

function resetForm() {
  form.username = ''
  form.password = ''
  form.nickname = ''
  form.enabled = true
  form.isSuper = false
}

function openCreate() {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
  nextTick(() => {
    treeRef.value?.setCheckedKeys([])
  })
}

function openEdit(row) {
  editingId.value = row.id
  form.username = row.username
  form.password = ''
  form.nickname = row.nickname
  form.enabled = row.enabled
  form.isSuper = row.isSuper
  dialogVisible.value = true
  nextTick(() => {
    if (!row.isSuper) {
      treeRef.value?.setCheckedKeys(row.permissions || [])
    }
  })
}

function checkAllPermissions() {
  const codes = flattenTree(permissionTree.value)
  treeRef.value?.setCheckedKeys(codes)
}

function clearPermissions() {
  treeRef.value?.setCheckedKeys([])
}

function collectPermissions() {
  const checked = treeRef.value?.getCheckedKeys(false) || []
  const half = treeRef.value?.getHalfCheckedKeys() || []
  return [...new Set([...checked, ...half])]
}

async function handleSubmit() {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload = {
      nickname: form.nickname,
      enabled: form.enabled,
      isSuper: form.isSuper,
      permissions: form.isSuper ? [] : collectPermissions()
    }
    if (form.password) payload.password = form.password

    if (editingId.value) {
      await updateAdminUser(editingId.value, payload, { loading: true })
      ElMessage.success('已更新')
    } else {
      await createAdminUser(
        {
          username: form.username,
          password: form.password,
          ...payload
        },
        { loading: true }
      )
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await loadData()
    if (editingId.value) {
      const row = list.value.find((item) => item.id === editingId.value)
      if (row?.username === userStore.username) {
        await userStore.fetchProfile()
      }
    }
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  if (!(await confirmAction('确定删除该管理员？', '删除确认', '删除'))) return
  await deleteAdminUser(id, { loading: true })
  ElMessage.success('已删除')
  loadData()
}

onMounted(async () => {
  await Promise.all([loadData(), loadPermissionTree()])
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.perm-panel {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  max-height: 360px;
  overflow: auto;
  background: #f8fafc;
}

.perm-actions {
  margin-bottom: 8px;
}

.form-tip {
  margin-left: 12px;
  color: #94a3b8;
  font-size: 12px;
}
</style>
