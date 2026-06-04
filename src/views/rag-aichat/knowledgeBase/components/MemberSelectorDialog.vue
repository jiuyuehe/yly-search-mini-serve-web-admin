<template>
  <Dialog
    v-model="dialogVisible"
    title="添加成员"
    width="960px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="selector-dialog">
      <div class="selector-card">
        <div class="section-title">部门树</div>
        <div class="member-toolbar">
          <el-input v-model="treeSearchKey" clearable placeholder="搜索部门" size="small" />
          <el-button size="small" text :loading="treeLoading" @click="reloadTree">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
        <div class="member-tree-wrap member-panel" v-loading="treeLoading">
          <el-tree
            :data="displayDeptTreeData"
            :expand-on-click-node="false"
            :props="defaultProps"
            highlight-current
            node-key="id"
            @node-click="handleDeptClick"
          />
        </div>
      </div>

      <div class="selector-card">
        <div class="section-title section-title--between">
          <span>部门用户</span>
          <span>点击左侧部门树展开，选择要添加的部门</span>
          <span v-if="currentDeptId" class="dept-badge">
            <el-icon><FolderOpened /></el-icon>
            {{ currentDeptName }}
          </span>
        </div>
        <div class="member-toolbar">
          <el-input
            v-model="userSearchKey"
            clearable
            placeholder="搜索昵称 / 用户名 / ID"
            size="small"
          />
          <el-button
            type="primary"
            size="small"
            :disabled="!selectedUsers.length"
            :loading="saving"
            @click="submitMembers"
          >
            <el-icon class="mr-4px"><Plus /></el-icon>
            添加<span v-if="selectedUsers.length">&nbsp;{{ selectedUsers.length }}</span>
          </el-button>
        </div>

        <div v-if="currentDeptId" class="member-tree-wrap member-panel" v-loading="userLoading">
          <el-table
            :data="filteredDeptUsers"
            row-key="id"
            height="100%"
            stripe
            size="small"
            @selection-change="handleUserSelectionChange"
          >
            <el-table-column type="selection" width="44" />
            <el-table-column prop="nickname" label="昵称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="username" label="用户名" min-width="140" show-overflow-tooltip />
            <el-table-column prop="id" label="ID" width="90" align="center" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, FolderOpened, Plus, Refresh } from '@element-plus/icons-vue'

import {
  addMember,
  type KnowledgeBaseDeptVO,
  type KnowledgeBaseMemberAddReqVO,
  type KnowledgeBaseUserVO,
  getDeptList,
  getUserList
} from '@/api/rag-aichat/knowledgeBase'
import { defaultProps, filter, handleTree } from '@/utils/tree'

defineOptions({ name: 'RagAiKnowledgeBaseMemberSelectorDialog' })

const emit = defineEmits<{
  (e: 'success'): void
}>()

const dialogVisible = ref(false)
const datasetId = ref('')
const deptTreeList = ref<KnowledgeBaseDeptVO[]>([])
const currentDeptUsers = ref<KnowledgeBaseUserVO[]>([])
const selectedUsers = ref<KnowledgeBaseUserVO[]>([])
const currentDeptId = ref<number | null>(null)
const currentDeptName = ref('')
const treeSearchKey = ref('')
const userSearchKey = ref('')
const treeLoading = ref(false)
const userLoading = ref(false)
const saving = ref(false)
const deptUserCache = ref(new Map<number, KnowledgeBaseUserVO[]>())

const open = async (id: string | number) => {
  datasetId.value = String(id || '')
  dialogVisible.value = true
  await reloadTree()
}

defineExpose({ open })

const buildDeptTree = (list: KnowledgeBaseDeptVO[]) => {
  return handleTree(
    list.map((item) => ({ ...item })),
    'id',
    'parentId',
    'children'
  )
}

const displayDeptTreeData = computed(() => {
  const keyword = treeSearchKey.value.trim().toLowerCase()
  const tree = buildDeptTree(deptTreeList.value)

  if (!keyword) {
    return tree
  }

  return filter(tree, (node: KnowledgeBaseDeptVO) =>
    String(node.name || '')
      .toLowerCase()
      .includes(keyword)
  )
})

const filteredDeptUsers = computed(() => {
  const keyword = userSearchKey.value.trim().toLowerCase()
  if (!keyword) {
    return currentDeptUsers.value
  }

  return currentDeptUsers.value.filter((user) =>
    [user.nickname, user.username, String(user.id)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  )
})

const fetchMemberTree = async () => {
  treeLoading.value = true
  try {
    deptTreeList.value = await getDeptList()
  } catch (error) {
    console.error(error)
    deptTreeList.value = []
    ElMessage.error('获取部门树失败')
  } finally {
    treeLoading.value = false
  }
}

const loadDeptUsers = async (dept: KnowledgeBaseDeptVO) => {
  if (!dept?.id) return

  currentDeptId.value = dept.id
  currentDeptName.value = dept.name || ''
  selectedUsers.value = []
  currentDeptUsers.value = []
  userLoading.value = true

  try {
    const cached = deptUserCache.value.get(dept.id)
    if (cached) {
      currentDeptUsers.value = cached
      return
    }

    const users = await getUserList({ di: dept.id })
    deptUserCache.value.set(dept.id, users)
    currentDeptUsers.value = users
  } catch (error) {
    console.error(error)
    currentDeptUsers.value = []
    ElMessage.error('获取部门用户失败')
  } finally {
    userLoading.value = false
  }
}

const handleDeptClick = (data: KnowledgeBaseDeptVO) => {
  void loadDeptUsers(data)
}

const handleUserSelectionChange = (rows: KnowledgeBaseUserVO[]) => {
  selectedUsers.value = rows
}

const buildUserReqList = (users: KnowledgeBaseUserVO[]): KnowledgeBaseMemberAddReqVO[] => {
  return users.map((user) => ({
    userName: user.username,
    realName: user.nickname
  }))
}

const submitMembers = async () => {
  if (!selectedUsers.value.length) {
    ElMessage.warning('请选择要添加的用户')
    return
  }

  saving.value = true
  try {
    await addMember(datasetId.value, buildUserReqList(selectedUsers.value))
    ElMessage.success('添加成功')
    dialogVisible.value = false
    emit('success')
  } catch (error) {
    console.error(error)
    ElMessage.error('添加失败')
  } finally {
    saving.value = false
  }
}

const reloadTree = async () => {
  currentDeptId.value = null
  currentDeptName.value = ''
  currentDeptUsers.value = []
  selectedUsers.value = []
  deptUserCache.value = new Map()
  await fetchMemberTree()
}

const handleClosed = () => {
  treeSearchKey.value = ''
  userSearchKey.value = ''
  currentDeptId.value = null
  currentDeptName.value = ''
  currentDeptUsers.value = []
  selectedUsers.value = []
  deptTreeList.value = []
  deptUserCache.value = new Map()
  datasetId.value = ''
}
</script>

<style scoped>
.selector-dialog {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  height: 560px;
  min-height: 0;
}

.selector-card {
  display: flex;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  background: var(--app-bg-card);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  flex-direction: column;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.section-title--between {
  justify-content: space-between;
}

.member-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.member-toolbar :deep(.el-input) {
  flex: 1;
}

.member-tree-wrap {
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.member-panel {
  padding: 10px 12px;
  background: var(--app-bg-subtle);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-md);
}

.member-tree-wrap :deep(.el-tree) {
  padding: 2px 0;
  overflow: auto;
}

.member-tree-wrap :deep(.el-table) {
  height: 100%;
}

.dept-badge {
  display: inline-flex;
  max-width: 180px;
  padding: 3px 10px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  color: var(--app-color-brand);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgb(0 82 217 / 6%);
  border-radius: 999px;
  align-items: center;
  gap: 5px;
}

.dept-empty {
  display: flex;
  min-height: 0;
  padding: 32px 20px;
  font-size: 13px;
  color: var(--app-text-secondary);
  background: var(--app-bg-subtle);
  border: 2px dashed var(--app-border-color);
  border-radius: var(--app-radius-md);
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.dept-empty-icon {
  font-size: 28px;
  color: var(--app-text-disabled);
}

@media (width <= 900px) {
  .selector-dialog {
    grid-template-columns: 1fr;
    height: auto;
  }

  .selector-card {
    min-height: 260px;
  }

  .dept-badge {
    display: none;
  }
}
</style>
