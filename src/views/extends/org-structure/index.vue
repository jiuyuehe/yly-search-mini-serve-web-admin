<template>
  <ContentWrap class="mb-16px">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h2 class="text-18px font-500 mb-4px">组织架构管理</h2>
        <p class="text-13px text-gray-500">
          通过左侧部门树 + 右侧用户列表，完成部门结构维护、用户多部门展示及一键增删操作。
        </p>
      </div>
      <el-button type="primary" @click="openCreateDept()">
        <Icon icon="ep:plus" class="mr-4px" />
        新增根部门
      </el-button>
    </div>
  </ContentWrap>

  <el-row :gutter="16">
    <el-col :xs="24" :lg="8" :xl="6">
      <ContentWrap class="org-structure-left h-600px">
        <div class="flex items-center gap-8px mb-12px">
          <el-input
            v-model="deptKeyword"
            placeholder="搜索部门"
            clearable
            @clear="handleFilterDept"
            @input="handleFilterDept"
          >
            <template #prefix>
              <Icon icon="ep:search" />
            </template>
          </el-input>
          <el-button text type="primary" @click="handleRefreshTree">刷新</el-button>
          <el-button text type="primary" @click="toggleExpandAll">
            {{ treeExpandedAll ? '折叠' : '展开' }}
          </el-button>
        </div>

        <el-tree
          ref="deptTreeRef"
          v-loading="deptTreeLoading"
          class="org-structure-tree"
          :data="deptTree"
          node-key="id"
          highlight-current
          :props="treeProps"
          :expand-on-click-node="false"
          :filter-node-method="filterDeptNode"
          @node-click="handleDeptClick"
        >
          <template #default="{ data }">
            <div class="tree-node">
              <span class="tree-node__label">
                {{ data.name }}
                <span class="tree-node__source">[{{ getDeptSourceLabel(data) }}]</span>
              </span>
              <el-dropdown trigger="click" @command="(cmd: string) => handleDeptCommand(cmd, data)">
                <span class="tree-node__action">
                  <Icon icon="ep:more" />
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="add">新增子部门</el-dropdown-item>
                    <el-dropdown-item command="edit">编辑部门</el-dropdown-item>
                    <el-dropdown-item command="delete">删除部门</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-tree>
      </ContentWrap>
    </el-col>

    <el-col :xs="24" :lg="16" :xl="18">
      <ContentWrap>
        <div class="flex flex-col gap-12px">
          <el-form :model="userQuery" :inline="true" label-width="70px" class="org-structure-query">
            <el-form-item label="用户名">
              <el-input
                v-model="userQuery.username"
                placeholder="请输入用户名"
                clearable
                class="!w-220px"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input
                v-model="userQuery.nickname"
                placeholder="请输入昵称"
                clearable
                class="!w-220px"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">
                <Icon icon="ep:search" class="mr-4px" /> 查询
              </el-button>
              <el-button @click="handleReset">
                <Icon icon="ep:refresh-right" class="mr-4px" /> 重置
              </el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="userLoading" :data="userList" border class="mt-4">
            <el-table-column type="index" width="60" label="#" />
            <el-table-column prop="username" label="用户名" min-width="140" />
            <el-table-column prop="nickname" label="昵称" min-width="120" />
            <el-table-column label="所属部门" min-width="260">
              <template #default="{ row }">
                <el-space wrap>
                  <el-tag
                    v-for="deptId in row.deptIds"
                    :key="deptId"
                    size="small"
                    effect="plain"
                  >
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
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-dropdown trigger="click" @command="(command) => handleUserCommand(command, row)">
                  <el-button type="primary" link size="small">
                    <Icon icon="ep:more" />
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">编辑用户</el-dropdown-item>
                      <el-dropdown-item command="addDept">添加到部门</el-dropdown-item>
                      <el-dropdown-item command="removeDept">从部门移除</el-dropdown-item>
                      <el-dropdown-item command="resetPwd">更改密码</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除用户</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <el-empty
            v-if="!userLoading && userList.length === 0"
            description="暂无用户数据，可通过“添加到部门”进行绑定。"
          />
        </div>
      </ContentWrap>
    </el-col>
  </el-row>

  <!-- 部门新增/编辑 -->
  <el-dialog v-model="deptDialog.visible" :title="deptDialog.title" width="460px" destroy-on-close>
    <el-form :model="deptForm" :rules="deptRules" ref="deptFormRef" label-width="90px">
      <el-form-item label="部门名称" prop="name">
        <el-input v-model="deptForm.name" placeholder="请输入部门名称" />
      </el-form-item>
      <el-form-item label="父级部门" prop="parentId">
        <el-tree-select
          v-model="deptForm.parentId"
          :data="deptTree"
          :props="{ value: 'id', label: 'name', children: 'children' }"
          check-strictly
          clearable
          placeholder="不选择默认为根节点"
        />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="deptForm.sort" :min="0" class="!w-200px" />
      </el-form-item>
      <el-form-item label="负责人ID" prop="leaderUserId">
        <el-input-number
          v-model="deptForm.leaderUserId"
          :min="1"
          class="!w-200px"
          placeholder="可选"
        />
      </el-form-item>
      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="deptForm.phone" placeholder="可选" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="deptForm.email" placeholder="可选" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="deptForm.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="deptDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="handleSaveDept">保存</el-button>
    </template>
  </el-dialog>

  <!-- 用户编辑 -->
  <el-dialog v-model="userDialog.visible" title="编辑用户" width="480px" destroy-on-close>
    <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="90px">
      <el-form-item label="用户名">
        <el-input v-model="userForm.username" disabled />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="userForm.nickname" placeholder="请输入昵称" />
      </el-form-item>
      <el-form-item label="手机号" prop="mobile">
        <el-input v-model="userForm.mobile" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="userForm.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="userForm.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="userDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="handleSaveUser" :loading="userDialog.loading">保存</el-button>
    </template>
  </el-dialog>

  <!-- 添加到部门 -->
  <el-dialog
    v-model="assignDialog.visible"
    title="添加到部门"
    width="480px"
    destroy-on-close
  >
    <p class="text-13px text-gray-500 mb-10px">
      勾选需要追加的部门，保存后会与用户当前所属部门合并。
    </p>
    <el-tree
      ref="assignTreeRef"
      :data="deptTree"
      show-checkbox
      node-key="id"
      default-expand-all
      :props="treeProps"
    />
    <template #footer>
      <el-button @click="assignDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="handleAssignDept">添加</el-button>
    </template>
  </el-dialog>

  <!-- 从部门移除 -->
  <el-dialog
    v-model="removeDialog.visible"
    title="从部门移除"
    width="420px"
    destroy-on-close
  >
    <el-checkbox-group v-model="removeDialog.checkedDeptIds">
      <el-checkbox
        v-for="deptId in removeDialog.availableDeptIds"
        :key="deptId"
        :label="deptId"
      >
        {{ getDeptName(deptId) }}
      </el-checkbox>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="removeDialog.visible = false">取消</el-button>
      <el-button type="danger" @click="handleRemoveDept">移除</el-button>
    </template>
  </el-dialog>

  <!-- 更改密码 -->
  <el-dialog
    v-model="passwordDialog.visible"
    :title="`更改密码 - ${passwordDialog.user?.username || ''}`"
    width="420px"
    destroy-on-close
  >
    <el-form label-width="80px" autocomplete="off">
      <el-form-item label="新密码">
        <InputPassword
          v-model="passwordDialog.password"
          placeholder="请输入新密码"
          :name="passwordDialog.inputName"
          inputmode="text"
          strength
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="passwordDialog.visible = false">取消</el-button>
      <el-button type="primary" :loading="passwordDialog.loading" @click="handlePasswordSubmit">
        确认
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Icon } from '@/components/Icon'
import { dateFormatter } from '@/utils/formatTime'
import { handleTree } from '@/utils/tree'
import type { FormInstance, FormRules, ElTree } from 'element-plus'
import * as OrgStructureApi from '@/api/extends/orgStructure'
import InputPassword from '@/components/InputPassword/src/InputPassword.vue'

defineOptions({ name: 'ExtOrgStructure' })

const message = useMessage()

const deptTree = ref<OrgStructureApi.OrgDeptVO[]>([])
const deptTreeRef = ref<InstanceType<typeof ElTree>>()
const deptTreeLoading = ref(false)
const deptKeyword = ref('')
const treeProps = {
  label: 'name',
  children: 'children'
}

const currentDeptId = ref<number>()
const deptMap = shallowRef(new Map<number, OrgStructureApi.OrgDeptVO>())

const userList = ref<OrgStructureApi.OrgUserRespVO[]>([])
const userLoading = ref(false)
const userQuery = reactive({
  username: '',
  nickname: ''
})

const filterDeptNode = (value: string, data: OrgStructureApi.OrgDeptVO) => {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase())
}

const handleFilterDept = () => {
  deptTreeRef.value?.filter(deptKeyword.value)
}

const treeExpandedAll = ref(false)

const applyExpandState = (expand: boolean) => {
  const tree = deptTreeRef.value as any
  if (!tree?.store?._getAllNodes) return
  tree.store._getAllNodes().forEach((node: any) => {
    node.expanded = expand
  })
}

const toggleExpandAll = () => {
  treeExpandedAll.value = !treeExpandedAll.value
  applyExpandState(treeExpandedAll.value)
}

const handleRefreshTree = async () => {
  await fetchDeptTree()
  applyExpandState(treeExpandedAll.value)
}

const buildDeptTree = (list: OrgStructureApi.OrgDeptVO[]) => {
  if (!list.length) {
    deptTree.value = []
    deptMap.value = new Map()
    currentDeptId.value = undefined
    userList.value = []
    return
  }
  deptMap.value = new Map(list.map((item) => [item.id, item]))
  deptTree.value = handleTree(list, 'id', 'parentId', 'children')
  if (!currentDeptId.value && deptTree.value.length) {
    currentDeptId.value = deptTree.value[0].id
    nextTick(() => {
      deptTreeRef.value?.setCurrentKey(currentDeptId.value)
      applyExpandState(treeExpandedAll.value)
      fetchDeptUsers()
    })
  } else if (currentDeptId.value) {
    nextTick(() => {
      deptTreeRef.value?.setCurrentKey(currentDeptId.value!)
      applyExpandState(treeExpandedAll.value)
    })
  }
}

const fetchDeptTree = async () => {
  deptTreeLoading.value = true
  try {
    const list = await OrgStructureApi.getDeptList()
    buildDeptTree(list)
  } finally {
    deptTreeLoading.value = false
  }
}

const fetchDeptUsers = async () => {
  if (!currentDeptId.value) {
    userList.value = []
    return
  }
  userLoading.value = true
  try {
    const params = {
      account: userQuery.username || undefined,
      name: userQuery.nickname || undefined
    }
    userList.value = await OrgStructureApi.getUsersByDept(currentDeptId.value, params)
  } finally {
    userLoading.value = false
  }
}

const handleDeptClick = (dept: OrgStructureApi.OrgDeptVO) => {
  currentDeptId.value = dept.id
  fetchDeptUsers()
}

const handleSearch = () => {
  fetchDeptUsers()
}

const handleReset = () => {
  userQuery.username = ''
  userQuery.nickname = ''
  fetchDeptUsers()
}

const getDeptName = (deptId: number) => {
  return deptMap.value.get(deptId)?.name ?? `ID ${deptId}`
}

type SourceMeta = { userLabel: string; deptLabel: string; type: 'success' | 'info' | 'warning' | 'danger' }
const KINGDEE_SOURCE_META: SourceMeta = {
  userLabel: '金蝶云之家',
  deptLabel: '金蝶云之家',
  type: 'success'
}
const LOCAL_SOURCE_META: SourceMeta = {
  userLabel: '本地用户',
  deptLabel: '本地部门',
  type: 'info'
}
const SOURCE_TYPE_META: Record<string, SourceMeta> = {
  kingdee_cloud: KINGDEE_SOURCE_META,
  kingdeecloud: KINGDEE_SOURCE_META,
  'workflow_integration_kingdee_cloud': KINGDEE_SOURCE_META,
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

const getDeptSourceLabel = (dept: OrgStructureApi.OrgDeptVO) =>
  resolveSourceLabel(dept.sourceTypeName, dept.sourceType, '本地部门')

const getUserSourceLabel = (user: OrgStructureApi.OrgUserRespVO) =>
  resolveSourceLabel(user.sourceTypeName, user.sourceType, '本地用户')

// 部门表单
const deptDialog = reactive({
  visible: false,
  title: '',
  type: 'create' as 'create' | 'edit'
})
const deptForm = reactive({
  id: undefined as number | undefined,
  name: '',
  parentId: undefined as number | undefined,
  sort: 100,
  leaderUserId: undefined as number | undefined,
  phone: '',
  email: '',
  status: 1
})
const deptFormRef = ref<FormInstance>()
const deptRules: FormRules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序值', trigger: 'change' }]
}

const resetDeptForm = () => {
  deptForm.id = undefined
  deptForm.name = ''
  deptForm.parentId = undefined
  deptForm.sort = 100
  deptForm.leaderUserId = undefined
  deptForm.phone = ''
  deptForm.email = ''
  deptForm.status = 1
}

const openCreateDept = (parent?: OrgStructureApi.OrgDeptVO) => {
  deptDialog.visible = true
  deptDialog.type = 'create'
  deptDialog.title = parent ? `新增子部门 - ${parent.name}` : '新增部门'
  resetDeptForm()
  deptForm.parentId = parent?.id
}

const openEditDept = (dept: OrgStructureApi.OrgDeptVO) => {
  deptDialog.visible = true
  deptDialog.type = 'edit'
  deptDialog.title = `编辑部门 - ${dept.name}`
  deptForm.id = dept.id
  deptForm.name = dept.name
  deptForm.parentId = dept.parentId || undefined
  deptForm.sort = dept.sort
  deptForm.leaderUserId = dept.leaderUserId
  deptForm.phone = dept.phone ?? ''
  deptForm.email = dept.email ?? ''
  deptForm.status = dept.status
}

const handleSaveDept = async () => {
  await deptFormRef.value?.validate()
  const payload = {
    name: deptForm.name,
    parentId: deptForm.parentId,
    sort: deptForm.sort,
    leaderUserId: deptForm.leaderUserId,
    phone: deptForm.phone,
    email: deptForm.email,
    status: deptForm.status
  }
  if (deptDialog.type === 'create') {
    await OrgStructureApi.createDept(payload)
    message.success('新增成功')
  } else if (deptForm.id) {
    await OrgStructureApi.updateDept({ id: deptForm.id, ...payload })
    message.success('更新成功')
  }
  deptDialog.visible = false
  fetchDeptTree()
}

const handleDeptCommand = (command: string, dept: OrgStructureApi.OrgDeptVO) => {
  switch (command) {
    case 'add':
      openCreateDept(dept)
      break
    case 'edit':
      openEditDept(dept)
      break
    case 'delete':
      handleDeleteDept(dept)
      break
    default:
      break
  }
}

const handleDeleteDept = async (dept: OrgStructureApi.OrgDeptVO) => {
  try {
    await message.confirm(`确认删除部门「${dept.name}」吗？`, '提示')
    await OrgStructureApi.deleteDept(dept.id)
    message.success('删除成功')
    if (currentDeptId.value === dept.id) {
      currentDeptId.value = undefined
      userList.value = []
    }
    fetchDeptTree()
  } catch {
    // ignore
  }
}

// 用户编辑
const userDialog = reactive({
  visible: false,
  loading: false
})
const userForm = reactive({
  id: 0,
  username: '',
  nickname: '',
  mobile: '',
  email: '',
  status: 0
})
const userFormRef = ref<FormInstance>()
const userRules: FormRules = {
  nickname: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
  mobile: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }]
}
type EditableUser = {
  id: number
  username: string
  nickname: string
  mobile?: string
  email?: string
  status: number
}
const originalUser = ref<EditableUser | null>(null)

const openUserEdit = async (user: OrgStructureApi.OrgUserRespVO) => {
  userDialog.visible = true
  userDialog.loading = true
  try {
    const detail = await OrgStructureApi.getUserDetail(user.id)
    const baseUser = detail.originalUser || {}
    originalUser.value = {
      id: baseUser.id,
      username: baseUser.username,
      nickname: baseUser.nickname,
      mobile: baseUser.mobile ?? '',
      email: baseUser.email ?? '',
      status: baseUser.status ?? 0
    }
    userForm.id = originalUser.value.id
    userForm.username = originalUser.value.username
    userForm.nickname = originalUser.value.nickname
    userForm.mobile = originalUser.value.mobile ?? ''
    userForm.email = originalUser.value.email ?? ''
    userForm.status = originalUser.value.status ?? 0
  } finally {
    userDialog.loading = false
  }
}

const handleSaveUser = async () => {
  if (!originalUser.value) return
  await userFormRef.value?.validate()
  try {
    userDialog.loading = true
    const payload: OrgStructureApi.OrgUserUpdateReq = {
      id: originalUser.value.id,
      username: originalUser.value.username,
      nickname: userForm.nickname,
      mobile: userForm.mobile,
      email: userForm.email,
      status: userForm.status
    }
    await OrgStructureApi.updateUser(payload)
    message.success('用户信息已更新')
    userDialog.visible = false
    fetchDeptUsers()
  } finally {
    userDialog.loading = false
  }
}

// 添加到部门
const assignDialog = reactive({
  visible: false,
  user: null as OrgStructureApi.OrgUserRespVO | null
})
const assignTreeRef = ref<InstanceType<typeof ElTree>>()

const openAssignDept = (user: OrgStructureApi.OrgUserRespVO) => {
  assignDialog.visible = true
  assignDialog.user = user
  nextTick(() => {
    assignTreeRef.value?.setCheckedKeys([])
  })
}

const handleAssignDept = async () => {
  if (!assignDialog.user) return
  const checkedKeys = (assignTreeRef.value?.getCheckedKeys(false) as number[]) ?? []
  if (!checkedKeys.length) {
    message.warning('请选择至少一个要添加的部门')
    return
  }
  const merged = Array.from(new Set([...(assignDialog.user.deptIds || []), ...checkedKeys]))
  await OrgStructureApi.updateUserDepartments(assignDialog.user.id, merged)
  message.success('用户部门已更新')
  assignDialog.visible = false
  fetchDeptUsers()
}

// 从部门移除
const removeDialog = reactive({
  visible: false,
  checkedDeptIds: [] as number[],
  availableDeptIds: [] as number[],
  user: null as OrgStructureApi.OrgUserRespVO | null
})

const openRemoveDept = (user: OrgStructureApi.OrgUserRespVO) => {
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
    case 'edit':
      openUserEdit(row)
      break
    case 'addDept':
      openAssignDept(row)
      break
    case 'removeDept':
      openRemoveDept(row)
      break
    case 'resetPwd':
      handleChangePassword(row)
      break
    case 'delete':
      handleDeleteUser(row)
      break
  }
}

const handleDeleteUser = async (user: OrgStructureApi.OrgUserRespVO) => {
  try {
    await message.confirm(`确认删除用户「${user.username}」吗？`, '提示')
    await OrgStructureApi.deleteUser(user.id)
    message.success('用户已删除')
    fetchDeptUsers()
  } catch {
    // 用户取消或出错
  }
}

const handleChangePassword = async (user: OrgStructureApi.OrgUserRespVO) => {
  passwordDialog.visible = true
  passwordDialog.user = user
  passwordDialog.password = ''
  passwordDialog.inputName = `org-structure-password-${Date.now()}`
}

const passwordDialog = reactive<{
  visible: boolean
  user: OrgStructureApi.OrgUserRespVO | null
  password: string
  loading: boolean
  inputName: string
}>({
  visible: false,
  user: null,
  password: '',
  loading: false,
  inputName: 'org-structure-password'
})

const handlePasswordSubmit = async () => {
  if (!passwordDialog.password.trim()) {
    message.warning('密码不能为空')
    return
  }
  if (!passwordDialog.user) return
  try {
    passwordDialog.loading = true
    await OrgStructureApi.updateUserPassword(passwordDialog.user.id, passwordDialog.password.trim())
    message.success('密码已更新')
    passwordDialog.visible = false
  } catch (error) {
    console.error(error)
  } finally {
    passwordDialog.loading = false
  }
}

onMounted(() => {
  fetchDeptTree()
})
</script>

<style scoped>
.org-structure-left {
  min-height: 560px;
}

.org-structure-tree {
  max-height: 520px;
  overflow: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.tree-node__action {
  padding: 4px;
  color: var(--el-text-color-placeholder);
}

.tree-node__source {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.tree-node__action:hover {
  color: var(--el-color-primary);
}

</style>

