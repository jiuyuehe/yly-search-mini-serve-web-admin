<template>
  <div class="member-manager-panel">
    <div class="member-card">
      <div class="section-title">已添加成员</div>

      <div class="member-toolbar">
        <el-input
          v-model="memberSearchKey"
          clearable
          placeholder="搜索用户名 / 昵称 / 部门"
          size="small"
        />

        <el-button size="small" :loading="memberLoading" @click="fetchMembers">
          刷新成员
        </el-button>

        <el-button size="small" type="primary" @click="openSelectorDialog">
          添加成员
        </el-button>
      </div>

      <div class="member-table-wrap" v-loading="memberLoading">
        <el-table :data="filteredMemberList" stripe height="500">
          <el-table-column prop="userName" label="用户名" min-width="160" show-overflow-tooltip />
          <el-table-column prop="realName" label="昵称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="deptName" label="部门" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" width="120" align="center">
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

    <MemberSelectorDialog ref="selectorDialogRef" @success="fetchMembers" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import {
  deleteMember,
  getMemberList,
  type KnowledgeBaseMemberVO
} from '@/api/rag-aichat/knowledgeBase'
import { useUserStoreWithOut } from '@/store/modules/user'
import MemberSelectorDialog from './MemberSelectorDialog.vue'

defineOptions({ name: 'RagAiKnowledgeBaseMemberManagerPanel' })

const props = defineProps({
  datasetId: {
    type: [String, Number],
    required: true
  }
})

type MemberRow = KnowledgeBaseMemberVO

const userStore = useUserStoreWithOut()
const currentUserId = computed(() => Number(userStore.getUser.id || 0))
const selectorDialogRef = ref<{
  open: (datasetId: string | number) => Promise<void> | void
}>()

const memberList = ref<MemberRow[]>([])
const memberLoading = ref(false)
const memberSearchKey = ref('')

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
    const list = await getMemberList(String(props.datasetId))
    memberList.value = list.map(formatMemberRow)
  } catch (error) {
    console.error(error)
    memberList.value = []
    ElMessage.error('获取成员失败')
  } finally {
    memberLoading.value = false
  }
}

const filteredMemberList = computed(() => {
  const keyword = memberSearchKey.value.trim().toLowerCase()
  if (!keyword) {
    return memberList.value
  }

  return memberList.value.filter((row) =>
    [row.userName, row.realName, row.deptName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  )
})

const openSelectorDialog = () => {
  selectorDialogRef.value?.open(props.datasetId)
}

const removeMember = async (row: MemberRow) => {
  if (Number(row.userId) === currentUserId.value) {
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
  },
  {
    immediate: true
  }
)
</script>

<style scoped>
.member-manager-panel {
  height: 100%;
}

.member-card {
  display: flex;
  height: 100%;
  min-height: 0;
  padding: 16px 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  flex-direction: column;
}

.section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.member-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.member-toolbar :deep(.el-input) {
  flex: 1;
  max-width: 240px;
}

.member-table-wrap {
  min-height: 0;
  flex: 1;
}
</style>
