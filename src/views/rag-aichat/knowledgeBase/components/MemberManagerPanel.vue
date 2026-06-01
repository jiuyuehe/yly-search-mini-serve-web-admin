<template>
  <div class="member-manager-panel">
    <div class="member-card">
      <div class="section-title">成员列表</div>
      <div class="member-toolbar">
        <el-input
          v-model="memberSearchKey"
          clearable
          placeholder="搜索用户"
          class="member-search"
          @keyup.enter="fetchMembers"
        />
        <el-button @click="fetchMembers">刷新成员</el-button>
      </div>

      <el-table :data="memberList" v-loading="memberLoading" stripe>
        <el-table-column prop="userName" label="账号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="realName" label="姓名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="deptName" label="部门" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="120">
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

    <div class="member-card">
      <div class="section-title">添加成员</div>
      <div class="member-toolbar">
        <el-input
          v-model="treeSearchKey"
          clearable
          placeholder="按名称搜索部门 / 用户"
          class="member-search"
          @keyup.enter="reloadTree"
        />
        <el-button @click="reloadTree">刷新树</el-button>
        <el-button type="primary" :disabled="!selectedUserIds.length" :loading="saving" @click="addMembers">
          添加成员
        </el-button>
      </div>

      <el-tree
        ref="treeRef"
        :key="treeKey"
        class="member-tree"
        node-key="value"
        show-checkbox
        lazy
        :load="loadTreeNode"
        :props="treeProps"
        :expand-on-click-node="false"
        :check-strictly="true"
        @check="handleCheckChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, type ElTree } from 'element-plus'

import { useUserStoreWithOut } from '@/store/modules/user'
import {
  addMember,
  deleteMember,
  getDeptList,
  getMemberList,
  getUserList
} from '@/api/rag-aichat/knowledgeBase'

defineOptions({ name: 'RagAiKnowledgeBaseMemberManagerPanel' })

const props = defineProps({
  datasetId: { type: [String, Number], required: true }
})

const currentUserId = computed(() => Number(useUserStoreWithOut().getUser.id || 0))
const memberList = ref<any[]>([])
const memberLoading = ref(false)
const saving = ref(false)
const treeSearchKey = ref('')
const memberSearchKey = ref('')
const selectedUserIds = ref<string[]>([])
const treeRef = ref<InstanceType<typeof ElTree> | null>(null)
const loadedUserMap = ref(new Map<string, any>())
const treeKey = ref(0)

const treeProps = {
  children: 'children',
  label: 'label',
  isLeaf: 'isLeaf'
}

const normalizeList = (res: any) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.data?.list)) return res.data.list
  if (Array.isArray(res?.list)) return res.list
  return []
}

const fetchMembers = async () => {
  if (!props.datasetId) return
  memberLoading.value = true
  try {
    const res = await getMemberList(String(props.datasetId))
    const list = normalizeList(res)
    memberList.value = list
  } catch (error) {
    console.error(error)
    ElMessage.error('获取成员失败')
  } finally {
    memberLoading.value = false
  }
}

const buildDeptNode = (dept: any) => ({
  label: dept.deptName || dept.name || '',
  value: `dept_${dept.deptId || dept.id}`,
  isLeaf: false
})

const buildUserNode = (user: any) => ({
  label: `${user.realName || user.nickname || user.userName || ''}`,
  value: `user_${user.userId || user.id}`,
  userId: String(user.userId || user.id),
  userName: user.userName || user.username || '',
  realName: user.realName || user.nickname || '',
  isLeaf: true
})

const reloadTree = () => {
  selectedUserIds.value = []
  loadedUserMap.value = new Map()
  treeKey.value += 1
}

const loadTreeNode = async (node: any, resolve: (data: any[]) => void) => {
  const di = !node || node.level === 0
    ? -1
    : String(node.data?.value || '').startsWith('dept_')
      ? Number(String(node.data.value).replace('dept_', ''))
      : -1

  try {
    const [deptRes, userRes] = await Promise.all([
      getDeptList({ di, key: treeSearchKey.value.trim() || undefined }),
      di === -1 ? Promise.resolve([]) : getUserList({ di, key: treeSearchKey.value.trim() || undefined })
    ])
    const deptNodes = normalizeList(deptRes).map(buildDeptNode)
    const userNodes = normalizeList(userRes).map((user: any) => {
      const nodeItem = buildUserNode(user)
      loadedUserMap.value.set(nodeItem.value, nodeItem)
      return nodeItem
    })
    resolve([...deptNodes, ...userNodes])
  } catch (error) {
    console.error(error)
    resolve([])
  }
}

const addMembers = async () => {
  const checkedKeys = selectedUserIds.value.length
    ? selectedUserIds.value
    : treeRef.value?.getCheckedKeys(false) || []
  const userKeys = checkedKeys.filter((key: string) => String(key).startsWith('user_'))
  if (!userKeys.length) {
    ElMessage.warning('请选择要添加的用户')
    return
  }

  const users = userKeys
    .map((key: string) => loadedUserMap.value.get(key))
    .filter(Boolean)
    .map((user: any) => ({
      userId: Number(user.userId),
      userName: user.userName,
      realName: user.realName
    }))

  if (!users.length) {
    ElMessage.warning('当前选中的用户尚未加载，请先展开树节点')
    return
  }

  saving.value = true
  try {
    await addMember(String(props.datasetId), users)
    ElMessage.success('添加成功')
    treeRef.value?.setCheckedKeys([])
    selectedUserIds.value = []
    await fetchMembers()
  } catch (error) {
    console.error(error)
    ElMessage.error('添加失败')
  } finally {
    saving.value = false
  }
}

const handleCheckChange = () => {
  selectedUserIds.value = (treeRef.value?.getCheckedKeys(false) || []) as string[]
}

const removeMember = async (row: any) => {
  if (Number(row.userId || row.id) === currentUserId.value) {
    ElMessage.warning('不能移除当前登录用户')
    return
  }
  try {
    await deleteMember(String(props.datasetId), String(row.userId || row.id))
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
    reloadTree()
  },
  { immediate: true }
)
</script>

<style scoped>
.member-manager-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.member-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 18px;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  background: #fff;
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

.member-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-md);
  padding: 12px;
  background: var(--app-bg-subtle);
}

@media (max-width: 1200px) {
  .member-manager-panel {
    grid-template-columns: 1fr;
  }
}
</style>
