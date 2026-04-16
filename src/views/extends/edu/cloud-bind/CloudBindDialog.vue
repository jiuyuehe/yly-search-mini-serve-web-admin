<template>
  <Dialog v-model="dialogVisible" title="绑定云盘账号" width="1100px" :fullscreen="false">
    <div class="mb-12px rounded-6px bg-[var(--el-fill-color-light)] px-14px py-12px">
      <div class="text-14px font-600">校园后台用户</div>
      <div class="mt-8px flex flex-wrap gap-x-20px gap-y-6px text-13px text-[var(--el-text-color-secondary)]">
        <span>编号：{{ campusUser?.id || '-' }}</span>
        <span>用户名：{{ campusUser?.username || '-' }}</span>
        <span>昵称：{{ campusUser?.nickname || '-' }}</span>
        <span>手机号：{{ campusUser?.mobile || '-' }}</span>
        <span>部门：{{ campusUser?.deptName || '-' }}</span>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :span="8">
        <div class="h-520px rounded-6px border border-[var(--el-border-color)] p-12px">
          <el-input v-model="deptKeyword" clearable placeholder="搜索云盘部门" class="mb-12px">
            <template #prefix>
              <Icon icon="ep:search" />
            </template>
          </el-input>
          <el-scrollbar height="452px">
            <el-tree
              ref="treeRef"
              :data="deptTree"
              :default-expanded-keys="defaultExpandedKeys"
              lazy
              node-key="deptId"
              highlight-current
              :load="loadDeptNodes"
              :props="treeProps"
              :expand-on-click-node="false"
              :filter-node-method="filterDeptNode"
              @node-click="handleDeptClick"
            />
          </el-scrollbar>
        </div>
      </el-col>

      <el-col :span="16">
        <div class="h-520px rounded-6px border border-[var(--el-border-color)] p-12px">
          <div class="mb-12px flex flex-wrap items-center gap-12px">
            <el-input v-model="userKeyword" clearable placeholder="搜索云盘用户名称或账号" class="!w-260px">
              <template #prefix>
                <Icon icon="ep:search" />
              </template>
            </el-input>
            <el-input
              v-model="remark"
              clearable
              maxlength="255"
              placeholder="备注，可选"
              show-word-limit
              class="min-w-0 flex-1"
            />
          </div>

          <el-alert
            :closable="false"
            type="info"
            show-icon
            class="mb-12px"
            :title="currentDept ? `当前部门：${currentDept.deptName} , 用户数量：${filteredCloudUsers.length}` : '请选择左侧云盘部门后查看用户'"
          />

          <el-table
            v-loading="userLoading"
            :data="filteredCloudUsers"
            :show-overflow-tooltip="true"
            :stripe="true"
            height="400"
          >
            <el-table-column label="云盘用户 ID" align="center" prop="cloudUserId" width="110" />
            <el-table-column label="云盘用户名" align="center" prop="cloudUserName" min-width="160" />
            <el-table-column label="云盘账号" align="center" prop="cloudAccount" min-width="150" />
            <el-table-column label="云盘部门" align="center" prop="cloudDeptName" min-width="160" />
            <el-table-column label="操作" align="center" width="100" fixed="right">
              <template #default="scope">
                <el-button
                  link
                  type="primary"
                  :loading="submitLoading"
                  @click="handleBind(scope.row)"
                >
                  绑定
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </Dialog>
</template>

<script setup lang="ts">
import type { ElTree } from 'element-plus'
import * as EduApi from '@/api/extends/edu'

defineOptions({ name: 'EduCloudBindDialog' })

interface CampusUserLite {
  id: number
  username?: string
  nickname?: string
  mobile?: string
  deptName?: string
}

type CloudDeptTreeNode = EduApi.CloudDeptVO & {
  leaf?: boolean
  children?: CloudDeptTreeNode[]
  nodeType?: 'root' | 'unassigned' | 'dept'
  queryDeptId?: number
}

const CLOUD_ROOT_NODE: CloudDeptTreeNode = {
  deptId: -2,
  deptName: '云盘组织架构',
  leaf: false,
  nodeType: 'root'
}

const UNASSIGNED_NODE: CloudDeptTreeNode = {
  deptId: -1,
  deptName: '未分配',
  leaf: true,
  nodeType: 'unassigned',
  queryDeptId: -1
}

const message = useMessage()

const dialogVisible = ref(false)
const submitLoading = ref(false)
const userLoading = ref(false)
const treeRef = ref<InstanceType<typeof ElTree>>()

const campusUser = ref<CampusUserLite>()
const currentDept = ref<CloudDeptTreeNode>()
const cloudUsers = ref<EduApi.CloudUserVO[]>([])
const deptTree = ref<CloudDeptTreeNode[]>([{ ...CLOUD_ROOT_NODE }, { ...UNASSIGNED_NODE }])
const defaultExpandedKeys = ref<number[]>([CLOUD_ROOT_NODE.deptId])
const deptKeyword = ref('')
const userKeyword = ref('')
const remark = ref('')

const treeProps = {
  label: 'deptName',
  children: 'children',
  isLeaf: 'leaf'
}

const filteredCloudUsers = computed(() => {
  const keyword = userKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return cloudUsers.value
  }
  return cloudUsers.value.filter((item) =>
    [item.cloudUserName, item.cloudAccount, item.cloudDeptName].some((field) =>
      (field || '').toLowerCase().includes(keyword)
    )
  )
})

watch(deptKeyword, (value) => {
  treeRef.value?.filter(value)
})

const filterDeptNode = (value: string, data: EduApi.CloudDeptVO) => {
  if (!value) return true
  return data.deptName.toLowerCase().includes(value.toLowerCase())
}

const loadDeptNodes = async (node: any, resolve: (data: CloudDeptTreeNode[]) => void) => {
  if (node.level === 0) {
    resolve(deptTree.value)
    return
  }
  const currentNode = node.data as CloudDeptTreeNode
  if (currentNode.nodeType === 'root') {
    const list = await EduApi.getCloudDeptList(-1)
    resolve(list.map((item) => ({ ...item, nodeType: 'dept', queryDeptId: item.deptId })))
    return
  }
  const list = await EduApi.getCloudDeptList(currentNode.queryDeptId ?? currentNode.deptId)
  resolve(list.map((item) => ({ ...item, nodeType: 'dept', queryDeptId: item.deptId })))
}

const handleDeptClick = async (data: CloudDeptTreeNode) => {
  currentDept.value = data
  userLoading.value = true
  try {
    const deptId = data.nodeType === 'root' ? undefined : (data.queryDeptId ?? data.deptId)
    cloudUsers.value = await EduApi.getCloudUserList(deptId)
  } finally {
    userLoading.value = false
  }
}

const resetForm = () => {
  currentDept.value = undefined
  cloudUsers.value = []
  deptTree.value = [{ ...CLOUD_ROOT_NODE }, { ...UNASSIGNED_NODE }]
  defaultExpandedKeys.value = [CLOUD_ROOT_NODE.deptId]
  deptKeyword.value = ''
  userKeyword.value = ''
  remark.value = ''
}

const open = async (user: CampusUserLite) => {
  campusUser.value = user
  resetForm()
  dialogVisible.value = true
  await nextTick()
  treeRef.value?.setCurrentKey(CLOUD_ROOT_NODE.deptId)
  ;(treeRef.value as any)?.getNode?.(CLOUD_ROOT_NODE.deptId)?.expand?.()
  await handleDeptClick({ ...CLOUD_ROOT_NODE })
}

defineExpose({ open })

const emit = defineEmits(['success'])

const handleBind = async (cloudUser: EduApi.CloudUserVO) => {
  if (!campusUser.value?.id) return

  await message.confirm(
    `确认将云盘用户「${cloudUser.cloudUserName || cloudUser.cloudAccount}」绑定到当前校园用户吗？`
  )

  submitLoading.value = true
  try {
    await EduApi.bindCloudUser({
      campusUserId: campusUser.value.id,
      cloudUserId: cloudUser.cloudUserId,
      cloudUserName: cloudUser.cloudUserName,
      cloudAccount: cloudUser.cloudAccount,
      cloudDeptId: cloudUser.cloudDeptId,
      cloudDeptName: cloudUser.cloudDeptName,
      remark: remark.value || undefined
    })
    message.success('绑定成功')
    dialogVisible.value = false
    emit('success')
  } finally {
    submitLoading.value = false
  }
}
</script>
