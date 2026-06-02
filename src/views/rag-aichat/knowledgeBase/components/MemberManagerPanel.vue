<template>
  <div class="member-manager-panel">
    <div class="member-card member-card--members">
      <div class="section-title">已添加成员</div>
      <div class="member-toolbar">
        <el-input
          v-model="memberSearchKey"
          clearable
          placeholder="搜索用户名 / 昵称 / 部门"
          class="member-search"
        />
        <el-button :loading="memberLoading" @click="fetchMembers">刷新成员</el-button>
      </div>

      <div class="member-table-wrap" v-loading="memberLoading">
        <el-table :data="filteredMemberList" stripe height="100%">
          <el-table-column prop="userName" label="用户名" min-width="160" show-overflow-tooltip />
          <el-table-column prop="realName" label="昵称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="deptName" label="部门" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-popconfirm title="确定移除该成员吗？" @confirm="removeMember(row)">
                <template #reference>
                  <el-button link type="danger" :disabled="Number(row.userId) === currentUserId">
                    移除
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="member-bottom">
      <div class="member-card">
        <div class="section-title">部门树</div>
        <div class="member-toolbar">
          <el-input
            v-model="treeSearchKey"
            clearable
            placeholder="搜索部门"
            class="member-search"
          />
          <el-button @click="reloadTree">刷新树</el-button>
        </div>

        <div class="member-tree-wrap" v-loading="treeLoading">
          <el-tree
            :data="displayDeptTreeData"
            :expand-on-click-node="false"
            :props="defaultProps"
            highlight-current
            node-key="id"
            @node-expand="handleDeptExpand"
          />
        </div>
      </div>

      <div class="member-card">
        <div class="section-title flex items-center justify-between gap-12px">
          <span>部门用户</span>
          <span class="section-subtitle">{{ currentDeptName || '请先展开并选择一个部门' }}</span>
        </div>
        <div class="member-toolbar">
          <el-input
            v-model="userSearchKey"
            clearable
            placeholder="搜索昵称 / 用户名 / ID"
            class="member-search"
          />
          <el-button type="primary" :disabled="!selectedUsers.length" :loading="saving" @click="addMembers">
            添加成员
          </el-button>
        </div>

        <div class="member-tree-wrap" v-if="currentDeptId" v-loading="userLoading">
          <el-table
            :data="filteredDeptUsers"
            row-key="id"
            height="100%"
            stripe
            @selection-change="handleUserSelectionChange"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="username" label="用户名" min-width="160" show-overflow-tooltip />
            <el-table-column prop="id" label="ID" width="100" />
          </el-table>
        </div>
        <el-empty v-else class="member-empty" description="请先点击左侧部门" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import {
  addMember,
  deleteMember,
  type KnowledgeBaseDeptVO,
  type KnowledgeBaseMemberVO,
  type KnowledgeBaseMemberAddReqVO,
  type KnowledgeBaseUserVO,
  getDeptList,
  getMemberList,
  getUserList
} from '@/api/rag-aichat/knowledgeBase'
import { useUserStoreWithOut } from '@/store/modules/user'
import { defaultProps, filter, handleTree } from '@/utils/tree'

defineOptions({ name: 'RagAiKnowledgeBaseMemberManagerPanel' })

const props = defineProps({
  datasetId: { type: [String, Number], required: true }
})

type MemberRow = KnowledgeBaseMemberVO

const currentUserId = computed(() => Number(useUserStoreWithOut().getUser.id || 0))
const memberList = ref<MemberRow[]>([])
const memberLoading = ref(false)
const treeLoading = ref(false)
const userLoading = ref(false)
const saving = ref(false)
const treeSearchKey = ref('')
const memberSearchKey = ref('')
const userSearchKey = ref('')
const deptTreeList = ref<KnowledgeBaseDeptVO[]>([])
const currentDeptId = ref<number | null>(null)
const currentDeptName = ref('')
const currentDeptUsers = ref<KnowledgeBaseUserVO[]>([])
const selectedUsers = ref<KnowledgeBaseUserVO[]>([])
const deptUserCache = ref(new Map<number, KnowledgeBaseUserVO[]>())

const formatMemberRow = (row: Record<string, any>): MemberRow => {
  return {
    ...row,
    userId: Number(row.userId ?? row.id)
  }
}

const fetchMembers = async () => {
  if (!props.datasetId) return
  memberLoading.value = true
  try {
    memberList.value = (await getMemberList(String(props.datasetId))).map(formatMemberRow)
  } catch (error) {
    console.error(error)
    memberList.value = []
    ElMessage.error('获取成员失败')
  } finally {
    memberLoading.value = false
  }
}

const fetchMemberTree = async () => {
  treeLoading.value = true
  try {
    deptTreeList.value = await getDeptList()
  } catch (error) {
    console.error(error)
    deptTreeList.value = []
  } finally {
    treeLoading.value = false
  }
}

const displayDeptTreeData = computed(() => {
  const keyword = treeSearchKey.value.trim().toLowerCase()
  if (!keyword) {
    return handleTree(
      deptTreeList.value.map((item) => ({ ...item })),
      'id',
      'parentId',
      'children'
    )
  }
  return filter(
    handleTree(
      deptTreeList.value.map((item) => ({ ...item })),
      'id',
      'parentId',
      'children'
    ),
    (node: KnowledgeBaseDeptVO) => node.name.toLowerCase().includes(keyword)
  )
})

const filteredMemberList = computed(() => {
  const keyword = memberSearchKey.value.trim().toLowerCase()
  if (!keyword) {
    return memberList.value
  }
  return memberList.value.filter((row) =>
    [row.userName, row.realName, row.deptName]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  )
})

const filteredDeptUsers = computed(() => {
  const keyword = userSearchKey.value.trim().toLowerCase()
  const list = currentDeptUsers.value
  if (!keyword) {
    return list
  }
  return list.filter((user) =>
    [user.nickname, user.username, String(user.id)]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  )
})

const buildUserReqList = (users: KnowledgeBaseUserVO[]): KnowledgeBaseMemberAddReqVO[] => {
  return users.map((user) => ({
    userName: user.username,
    realName: user.nickname
  }))
}

const loadDeptUsers = async (dept: KnowledgeBaseDeptVO) => {
  currentDeptId.value = dept.id
  currentDeptName.value = dept.name
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

const handleDeptExpand = (data: KnowledgeBaseDeptVO) => {
  void loadDeptUsers(data)
}

const handleUserSelectionChange = (rows: KnowledgeBaseUserVO[]) => {
  selectedUsers.value = rows
}

const reloadTree = async () => {
  currentDeptId.value = null
  currentDeptName.value = ''
  currentDeptUsers.value = []
  selectedUsers.value = []
  deptUserCache.value = new Map()
  await fetchMemberTree()
}

const addMembers = async () => {
  if (!selectedUsers.value.length) {
    ElMessage.warning('请选择要添加的用户')
    return
  }

  saving.value = true
  try {
    const users = buildUserReqList(selectedUsers.value)
    await addMember(String(props.datasetId), users)
    ElMessage.success('添加成功')
    selectedUsers.value = []
    await fetchMembers()
  } catch (error) {
    console.error(error)
    ElMessage.error('添加失败')
  } finally {
    saving.value = false
  }
}

const removeMember = async (row: MemberRow) => {
  if (row.userId === currentUserId.value) {
    ElMessage.warning('不能移除当前登录用户')
    return
  }
  try {
    await deleteMember(String(props.datasetId), String(row.userId))
    ElMessage.success('移除成功')
    await fetchMembers()
  } catch (error) {
    console.error(error)
    ElMessage.error('移除失败')
  }
}

watch(
  () => props.datasetId,
  () => {
    void fetchMembers()
    void reloadTree()
  },
  { immediate: true }
)
</script>

<style scoped>
.member-manager-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.member-card--members {
  flex: 0 0 auto;
}

.member-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 0;
  flex: 1;
}

.member-card {
  display: flex;
  min-height: 0;
  padding: 16px 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  flex-direction: column;
}

.section-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
}

.member-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.member-search {
  width: 220px;
}

.member-table-wrap,
.member-tree-wrap {
  display: flex;
  min-height: 0;
  flex: 1;
}

.member-table-wrap :deep(.el-table) {
  height: 100%;
}

.member-tree {
  min-height: 0;
  padding: 12px;
  overflow: auto;
  background: var(--app-bg-subtle);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-md);
  flex: 1;
}

@media (width <= 1200px) {
  .member-manager-panel {
    display: flex;
  }

  .member-bottom {
    grid-template-columns: 1fr;
  }
}
</style>
