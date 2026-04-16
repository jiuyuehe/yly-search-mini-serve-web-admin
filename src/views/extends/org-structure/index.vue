<template>
  <ContentWrap class="mb-16px">
    <div>
      <h2 class="text-18px font-500 mb-4px">组织架构管理</h2>
      <p class="text-13px text-gray-500">
        通过左侧部门树 + 右侧用户列表，完成部门结构维护、用户多部门展示及一键增删操作。
      </p>
    </div>
  </ContentWrap>

  <el-row :gutter="16">
    <el-col :xs="24" :lg="8" :xl="6">
      <DeptTreePanel
        :active-dept-id="preferredDeptId"
        @dept-change="handleDeptChange"
        @tree-change="handleDeptTreeChange"
      />
    </el-col>

    <el-col :xs="24" :lg="16" :xl="18">
      <ContentWrap>
        <div class="flex flex-col gap-12px">
          <el-form
            ref="queryFormRef"
            :model="userQuery"
            :inline="true"
            label-width="68px"
            class="org-structure-query"
          >
            <el-form-item label="用户名称" prop="username">
              <el-input
                v-model="userQuery.username"
                placeholder="请输入用户名称"
                clearable
                class="!w-220px"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item label="手机号码" prop="mobile">
              <el-input
                v-model="userQuery.mobile"
                placeholder="请输入手机号码"
                clearable
                class="!w-220px"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item label="状态" prop="status">
              <el-select
                v-model="userQuery.status"
                placeholder="请选择用户状态"
                clearable
                class="!w-220px"
              >
                <el-option
                  v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="创建时间" prop="createTime">
              <el-date-picker
                v-model="userQuery.createTime"
                value-format="YYYY-MM-DD HH:mm:ss"
                type="datetimerange"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                class="!w-240px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <Icon icon="ep:search" class="mr-4px" /> 查询
              </el-button>
              <el-button @click="handleReset">
                <Icon icon="ep:refresh-right" class="mr-4px" /> 重置
              </el-button>
              <el-button
                type="primary"
                plain
                @click="openCreateUserDialog"
                v-hasPermi="['system:user:create']"
              >
                <Icon icon="ep:plus" class="mr-4px" /> 新增
              </el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="userLoading" :data="userList" border class="mt-4">
            <el-table-column type="index" width="60" label="#" />
            <el-table-column label="头像" width="80" align="center">
              <template #default="{ row }">
                <el-image
                  v-if="row.avatar"
                  :src="row.avatar"
                  fit="cover"
                  style="width: 36px; height: 36px; border-radius: 50%"
                  :preview-src-list="[row.avatar]"
                  preview-teleported
                />
                <span v-else>--</span>
              </template>
            </el-table-column>
            <el-table-column prop="username" label="用户名" min-width="140" />
            <el-table-column prop="nickname" label="昵称" min-width="120" />
            <el-table-column label="所属部门" min-width="260">
              <template #default="{ row }">
                <el-space wrap>
                  <el-tag v-if="!row.deptIds?.length" size="small" type="info" effect="plain">
                    未分配
                  </el-tag>
                  <el-tag v-for="deptId in row.deptIds" :key="deptId" size="small">
                    {{ getDeptName(deptId) }}
                  </el-tag>
                </el-space>
              </template>
            </el-table-column>
            <el-table-column prop="mobile" label="手机号" min-width="140" />
            <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
            <el-table-column label="来源" width="120">
              <template #default="{ row }">
                <el-tag :type="getSourceTypeMeta(row.sourceType).type" effect="plain">
                  {{ getUserSourceLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" effect="plain">
                  {{ row.status === 0 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="createTime"
              label="创建时间"
              width="170"
              :formatter="dateFormatter"
            />
            <el-table-column label="操作" align="center" width="220" fixed="right">
              <template #default="{ row }">
                <div class="flex items-center justify-center">
                  <el-button
                    size="small"
                    type="primary"
                    link
                    @click="openUserEditDialog(row, 'basic')"
                    v-hasPermi="['system:user:update']"
                  >
                    <Icon icon="ep:edit" />修改
                  </el-button>
                  <el-dropdown
                    size="small"
                    trigger="click"
                    @command="(command) => handleUserCommand(command, row)"
                  >
                    <el-button size="small" type="primary" link>
                      <Icon icon="ep:d-arrow-right" /> 更多
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="addDept">
                          <Icon icon="ep:circle-plus-filled" />
                          添加到部门
                        </el-dropdown-item>
                        <el-dropdown-item command="removeDept">
                          <Icon icon="ep:remove-filled" /> 从部门移除
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="resetPwd"
                          v-if="checkPermi(['system:user:update-password'])"
                        >
                          <Icon icon="ep:key" />重置密码
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="assignRole"
                          v-if="checkPermi(['system:permission:assign-user-role'])"
                        >
                          <Icon icon="ep:circle-check" />分配角色
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="delete"
                          divided
                          v-if="checkPermi(['system:user:delete'])"
                        >
                          <Icon icon="ep:delete" />删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <Pagination
            :total="userTotal"
            v-model:page="userQuery.pageNo"
            v-model:limit="userQuery.pageSize"
            @pagination="fetchDeptUsers"
          />

          <el-empty
            v-if="!userLoading && userList.length === 0"
            description="暂无用户数据，可通过“新增”或“添加到部门”进行维护。"
          />
        </div>
      </ContentWrap>
    </el-col>
  </el-row>

  <!-- 添加到部门 -->
  <el-dialog v-model="assignDialog.visible" title="添加到部门" width="480px" destroy-on-close>
    <p class="text-13px text-gray-500 mb-10px">
      勾选后会直接保存为用户当前所属部门；取消已勾选部门时，会一并移除对应归属。
    </p>
    <div class="mb-12px">
      <span class="text-13px text-gray-500 mr-8px">当前已归属：</span>
      <el-space wrap>
        <el-tag v-if="!assignDialog.user?.deptIds?.length" size="small" type="info">
          未分配
        </el-tag>
        <el-tag
          v-for="deptId in assignDialog.user?.deptIds || []"
          :key="deptId"
          size="small"
          effect="plain"
        >
          {{ getDeptName(deptId) }}
        </el-tag>
      </el-space>
    </div>
    <el-tree
      ref="assignTreeRef"
      :data="deptTreeOptions"
      show-checkbox
      check-strictly
      check-on-click-node
      node-key="id"
      default-expand-all
      :props="{ label: 'name', children: 'children' }"
    />
    <template #footer>
      <el-button @click="assignDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="handleAssignDept">保存</el-button>
    </template>
  </el-dialog>

  <!-- 从部门移除 -->
  <el-dialog v-model="removeDialog.visible" title="从部门移除" width="420px" destroy-on-close>
    <el-checkbox-group v-model="removeDialog.checkedDeptIds">
      <el-checkbox v-for="deptId in removeDialog.availableDeptIds" :key="deptId" :label="deptId">
        {{ getDeptName(deptId) }}
      </el-checkbox>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="removeDialog.visible = false">取消</el-button>
      <el-button type="danger" @click="handleRemoveDept">移除</el-button>
    </template>
  </el-dialog>

  <OrgUserCreateDialog
    ref="createUserDialogRef"
    :dept-tree-options="deptTreeOptions"
    @success="handleCreateUserSuccess"
  />
  <OrgUserEditDialog ref="editUserDialogRef" @success="fetchDeptUsers" />
</template>

<script setup lang="ts">
import { Icon } from '@/components/Icon'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import { checkPermi } from '@/utils/permission'
import type { FormInstance, ElTree } from 'element-plus'
import * as OrgStructureApi from '@/api/extends/orgStructure'
import DeptTreePanel from './components/DeptTreePanel.vue'
import OrgUserCreateDialog from './components/OrgUserCreateDialog.vue'
import OrgUserEditDialog from './components/OrgUserEditDialog.vue'

defineOptions({ name: 'ExtOrgStructure' })

const message = useMessage()
const route = useRoute()

const currentDeptId = ref<number>()
const preferredDeptId = ref<number>()
const deptTreeOptions = ref<OrgStructureApi.OrgDeptVO[]>([])
const deptMap = shallowRef(new Map<number, OrgStructureApi.OrgDeptVO>())

const queryFormRef = ref<FormInstance>()
const userTotal = ref(0)
const userList = ref<OrgStructureApi.OrgUserRespVO[]>([])
const userLoading = ref(false)
const userQuery = reactive({
  pageNo: 1,
  pageSize: 10,
  username: undefined as string | undefined,
  mobile: undefined as string | undefined,
  status: undefined as number | undefined,
  createTime: [] as string[]
})

const normalizeRouteString = (value: unknown) => {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (typeof rawValue !== 'string') {
    return undefined
  }
  const trimmed = rawValue.trim()
  return trimmed || undefined
}

const normalizeRouteNumber = (value: unknown) => {
  const text = normalizeRouteString(value)
  if (!text) {
    return undefined
  }
  const numberValue = Number(text)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const applyRouteQuery = () => {
  userQuery.username = normalizeRouteString(route.query.username)
  userQuery.mobile = normalizeRouteString(route.query.mobile)
  userQuery.status = undefined
  userQuery.createTime = []
  userQuery.pageNo = 1
  preferredDeptId.value = normalizeRouteNumber(route.query.deptId)

  if (preferredDeptId.value === undefined || preferredDeptId.value === currentDeptId.value) {
    fetchDeptUsers()
  }
}

const fetchDeptUsers = async () => {
  if (!currentDeptId.value) {
    userList.value = []
    userTotal.value = 0
    return
  }
  userLoading.value = true
  try {
    const params: OrgStructureApi.OrgUserQuery = {
      account: userQuery.username || undefined,
      username: userQuery.username || undefined,
      mobile: userQuery.mobile || undefined,
      status: userQuery.status,
      createTime: userQuery.createTime.length ? userQuery.createTime : undefined,
      pageNo: userQuery.pageNo,
      pageSize: userQuery.pageSize
    }
    const data = await OrgStructureApi.getUsersByDept(currentDeptId.value, params)
    userList.value = data.list || []
    userTotal.value = data.total || 0
  } finally {
    userLoading.value = false
  }
}

const handleDeptChange = (dept?: OrgStructureApi.OrgDeptVO) => {
  currentDeptId.value = dept?.id
  userQuery.pageNo = 1
  fetchDeptUsers()
}

const handleDeptTreeChange = (payload: {
  tree: OrgStructureApi.OrgDeptVO[]
  assignableTree: OrgStructureApi.OrgDeptVO[]
  flatList: OrgStructureApi.OrgDeptVO[]
}) => {
  deptTreeOptions.value = payload.assignableTree
  deptMap.value = new Map(payload.flatList.map((item) => [item.id, item]))
}

const handleSearch = () => {
  userQuery.pageNo = 1
  fetchDeptUsers()
}

const handleReset = () => {
  queryFormRef.value?.resetFields()
  userQuery.pageNo = 1
  fetchDeptUsers()
}

const getDeptName = (deptId: number) => {
  return deptMap.value.get(deptId)?.name ?? `ID ${deptId}`
}

type SourceMeta = { userLabel: string; type: 'success' | 'info' | 'warning' | 'danger' }
const KINGDEE_SOURCE_META: SourceMeta = {
  userLabel: '金蝶云之家',
  type: 'success'
}
const LOCAL_SOURCE_META: SourceMeta = {
  userLabel: '本地用户',
  type: 'info'
}
const SOURCE_TYPE_META: Record<string, SourceMeta> = {
  kingdee_cloud: KINGDEE_SOURCE_META,
  kingdeecloud: KINGDEE_SOURCE_META,
  workflow_integration_kingdee_cloud: KINGDEE_SOURCE_META,
  local: LOCAL_SOURCE_META,
  '': LOCAL_SOURCE_META
}
const DEFAULT_SOURCE_META: SourceMeta = LOCAL_SOURCE_META

const normalizeSourceType = (source?: string) => (source ?? '').toLowerCase().trim()

const getSourceTypeMeta = (source?: string) => {
  const key = normalizeSourceType(source)
  return SOURCE_TYPE_META[key] || DEFAULT_SOURCE_META
}

const resolveSourceLabel = (
  sourceTypeName?: string,
  sourceType?: string,
  defaultLabel?: string
) => {
  const trimmedName = (sourceTypeName ?? '').trim()
  if (trimmedName) {
    return trimmedName
  }
  if (normalizeSourceType(sourceType)) {
    return '未配置'
  }
  return defaultLabel ?? '本地'
}

const getUserSourceLabel = (user: OrgStructureApi.OrgUserRespVO) =>
  resolveSourceLabel(user.sourceTypeName, user.sourceType, '本地用户')

const createUserDialogRef = ref()

const openCreateUserDialog = () => {
  createUserDialogRef.value?.open({
    defaultDeptId:
      currentDeptId.value && currentDeptId.value !== OrgStructureApi.UNASSIGNED_DEPT_ID
        ? currentDeptId.value
        : undefined
  })
}

const handleCreateUserSuccess = () => {
  fetchDeptUsers()
}

const editUserDialogRef = ref()

const buildUserEditPayload = (
  user: OrgStructureApi.OrgUserRespVO,
  activeTab: 'basic' | 'role'
) => ({
  id: user.id,
  deptNames: (user.deptIds || []).map((deptId) => getDeptName(deptId)),
  activeTab
})

const openUserEditDialog = (user: OrgStructureApi.OrgUserRespVO, activeTab: 'basic' | 'role') => {
  editUserDialogRef.value?.open(buildUserEditPayload(user, activeTab))
}

const assignDialog = reactive({
  visible: false,
  user: null as OrgStructureApi.OrgUserRespVO | null
})
const assignTreeRef = ref<InstanceType<typeof ElTree>>()

const openAssignDept = (user: OrgStructureApi.OrgUserRespVO) => {
  assignDialog.visible = true
  assignDialog.user = user
  nextTick(() => {
    assignTreeRef.value?.setCheckedKeys(user.deptIds || [])
  })
}

const handleAssignDept = async () => {
  if (!assignDialog.user) return
  const checkedKeys = (assignTreeRef.value?.getCheckedKeys(false) as number[]) ?? []
  await OrgStructureApi.updateUserDepartments(assignDialog.user.id, checkedKeys)
  message.success('用户部门已更新')
  assignDialog.visible = false
  fetchDeptUsers()
}

const removeDialog = reactive({
  visible: false,
  checkedDeptIds: [] as number[],
  availableDeptIds: [] as number[],
  user: null as OrgStructureApi.OrgUserRespVO | null
})

const openRemoveDept = (user: OrgStructureApi.OrgUserRespVO) => {
  if (!(user.deptIds || []).length) {
    message.warning('当前用户未分配部门')
    return
  }
  removeDialog.visible = true
  removeDialog.checkedDeptIds = []
  removeDialog.availableDeptIds = user.deptIds || []
  removeDialog.user = user
}

const handleRemoveDept = async () => {
  if (!removeDialog.user) return
  if (!removeDialog.checkedDeptIds.length) {
    message.warning('请选择至少一个需要移除的部门')
    return
  }
  const remain = (removeDialog.user.deptIds || []).filter(
    (deptId) => !removeDialog.checkedDeptIds.includes(deptId)
  )
  await OrgStructureApi.updateUserDepartments(removeDialog.user.id, remain)
  message.success('用户部门已更新')
  removeDialog.visible = false
  fetchDeptUsers()
}

const handleUserCommand = (command: string, row: OrgStructureApi.OrgUserRespVO) => {
  switch (command) {
    case 'addDept':
      openAssignDept(row)
      break
    case 'removeDept':
      openRemoveDept(row)
      break
    case 'resetPwd':
      handleResetPwd(row)
      break
    case 'assignRole':
      handleAssignRole(row)
      break
    case 'delete':
      handleDeleteUser(row)
      break
  }
}

const handleDeleteUser = async (user: OrgStructureApi.OrgUserRespVO) => {
  try {
    await message.delConfirm()
    await OrgStructureApi.deleteUser(user.id)
    message.success('删除成功')
    fetchDeptUsers()
  } catch {}
}

const handleResetPwd = async (user: OrgStructureApi.OrgUserRespVO) => {
  try {
    const result = await message.prompt(`请输入"${user.username}"的新密码`, '提醒')
    const password = result.value
    await OrgStructureApi.updateUserPassword(user.id, password)
    message.success('修改成功，新密码是：' + password)
  } catch {}
}

const handleAssignRole = (user: OrgStructureApi.OrgUserRespVO) => {
  openUserEditDialog(user, 'role')
}

watch(
  () => route.query,
  () => {
    applyRouteQuery()
  },
  {
    immediate: true
  }
)
</script>
