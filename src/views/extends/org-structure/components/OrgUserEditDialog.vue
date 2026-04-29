<template>
  <Dialog v-model="dialogVisible" title="编辑用户" width="760px">
    <div v-loading="formLoading" class="org-user-edit-dialog">
      <div class="dept-summary">
        <div class="dept-summary__label">当前部门</div>
        <el-space wrap>
          <el-tag v-if="!deptNames.length" type="info" effect="plain">未分配</el-tag>
          <el-tag v-for="deptName in deptNames" :key="deptName" effect="plain">
            {{ deptName }}
          </el-tag>
        </el-space>
        <p class="dept-summary__tip">部门归属请在列表页使用“添加到部门 / 从部门移除”维护。</p>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane v-if="canEditBasic" label="基础信息" name="basic">
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="88px"
          >
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="用户名称" prop="username">
                  <el-input v-model="formData.username" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="用户昵称" prop="nickname">
                  <el-input v-model="formData.nickname" placeholder="请输入用户昵称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="手机号码" prop="mobile">
                  <el-input v-model="formData.mobile" maxlength="11" placeholder="请输入手机号码" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="formData.email" maxlength="50" placeholder="请输入邮箱" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="用户性别" prop="sex">
                  <el-select v-model="formData.sex" placeholder="请选择用户性别" clearable>
                    <el-option
                      v-for="dict in getIntDictOptions(DICT_TYPE.SYSTEM_USER_SEX)"
                      :key="dict.value"
                      :label="dict.label"
                      :value="dict.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="岗位" prop="postIds">
                  <el-select
                    v-model="formData.postIds"
                    multiple
                    filterable
                    clearable
                    placeholder="请选择岗位"
                  >
                    <el-option
                      v-for="item in postList"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id!"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="formData.remark" type="textarea" placeholder="请输入备注" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="canAssignRole" label="分配角色" name="role">
          <el-form label-width="88px">
            <el-form-item label="角色">
              <el-select
                v-model="formData.roleIds"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
                placeholder="请选择角色"
              >
                <el-option
                  v-for="item in roleList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="canManageTeacher" label="教师扩展" name="teacher">
          <el-form
            ref="teacherFormRef"
            :model="teacherFormData"
            :rules="teacherFormRules"
            label-width="88px"
          >
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="教师工号" prop="teacherNo">
                  <el-input v-model="teacherFormData.teacherNo" placeholder="请输入教师工号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="职称" prop="title">
                  <el-input v-model="teacherFormData.title" placeholder="请输入职称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="入职日期" prop="hireDate">
                  <el-date-picker
                    v-model="teacherFormData.hireDate"
                    class="!w-100%"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="请选择入职日期"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="任职状态" prop="employmentStatus">
                  <el-select
                    v-model="teacherFormData.employmentStatus"
                    class="!w-100%"
                    clearable
                    placeholder="请选择任职状态"
                  >
                    <el-option
                      v-for="dict in getStrDictOptions(DICT_TYPE.EDU_TEACHER_EMPLOYMENT_STATUS)"
                      :key="dict.value"
                      :label="dict.label"
                      :value="dict.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="teacherFormData.remark" type="textarea" placeholder="请输入备注" />
            </el-form-item>
            <el-form-item label="扩展 JSON" prop="extraJson">
              <el-input
                v-model="teacherFormData.extraJson"
                type="textarea"
                placeholder="请输入扩展 JSON"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button :loading="submitLoading" type="primary" @click="submitForm">保存</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus'
import * as PermissionApi from '@/api/system/permission'
import * as PostApi from '@/api/system/post'
import * as RoleApi from '@/api/system/role'
import * as UserApi from '@/api/system/user'
import * as EduApi from '@/api/extends/edu'
import * as OrgStructureApi from '@/api/extends/orgStructure'
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { checkPermi } from '@/utils/permission'

defineOptions({ name: 'OrgStructureUserEditDialog' })

type OpenPayload = {
  id: number
  deptIds?: number[]
  deptNames?: string[]
  activeTab?: EditTab
}

type EditTab = 'basic' | 'role' | 'teacher'

type FormData = OrgStructureApi.OrgUserUpdateReq & {
  roleIds: number[]
}

const message = useMessage()
const emit = defineEmits(['success'])

const canEditBasic = checkPermi(['system:user:update'])
const canAssignRole = checkPermi(['system:permission:assign-user-role'])
const canQueryTeacher = checkPermi(['edu:teacher:query'])
const canCreateTeacher = checkPermi(['edu:teacher:create'])
const canUpdateTeacher = checkPermi(['edu:teacher:update'])
const canManageTeacher = canQueryTeacher && (canCreateTeacher || canUpdateTeacher)

const dialogVisible = ref(false)
const formLoading = ref(false)
const submitLoading = ref(false)
const activeTab = ref<EditTab>('basic')
const deptNames = ref<string[]>([])
const defaultTeacherDeptIds = ref<number[]>([])
const formRef = ref<FormInstance>()
const teacherFormRef = ref<FormInstance>()
const postList = ref<PostApi.PostVO[]>([])
const roleList = ref<RoleApi.RoleVO[]>([])

const createDefaultFormData = (): FormData => ({
  id: 0,
  username: '',
  nickname: '',
  remark: '',
  deptId: undefined,
  postIds: [],
  mobile: '',
  email: '',
  sex: undefined,
  avatar: '',
  roleIds: []
})

const formData = ref<FormData>(createDefaultFormData())

const normalizeDeptIds = (deptIds?: number[]) =>
  Array.from(
    new Set((deptIds ?? []).filter((deptId): deptId is number => typeof deptId === 'number'))
  )

const createDefaultTeacherFormData = (userId = 0, deptIds: number[] = []): EduApi.EduTeacherVO => ({
  userId,
  teacherNo: '',
  title: '',
  hireDate: '',
  employmentStatus: '',
  deptIds,
  remark: '',
  extraJson: ''
})

const teacherFormData = ref<EduApi.EduTeacherVO>(createDefaultTeacherFormData())

const formRules: FormRules = {
  nickname: [{ required: true, message: '用户昵称不能为空', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }],
  mobile: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号码',
      trigger: 'blur'
    }
  ]
}

function isFilled(value?: string | number | null) {
  return `${value ?? ''}`.trim().length > 0
}

function hasTeacherInput() {
  const data = teacherFormData.value
  return (
    isFilled(data.teacherNo) ||
    isFilled(data.title) ||
    isFilled(data.hireDate) ||
    isFilled(data.employmentStatus) ||
    isFilled(data.remark) ||
    isFilled(data.extraJson)
  )
}

function shouldSaveTeacher() {
  return Boolean(teacherFormData.value.id || hasTeacherInput())
}

const validateTeacherEmploymentStatus = (
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void
) => {
  if (shouldSaveTeacher() && !isFilled(value)) {
    callback(new Error('任职状态不能为空'))
    return
  }
  callback()
}

const teacherFormRules: FormRules = {
  employmentStatus: [{ validator: validateTeacherEmploymentStatus, trigger: 'change' }]
}

const resolveActiveTab = (tab?: EditTab) => {
  if (tab === 'teacher' && canManageTeacher) {
    return 'teacher'
  }
  if (tab === 'role' && canAssignRole) {
    return 'role'
  }
  if (canEditBasic) {
    return 'basic'
  }
  if (canManageTeacher) {
    return 'teacher'
  }
  return 'role'
}

const open = async (payload: OpenPayload) => {
  dialogVisible.value = true
  defaultTeacherDeptIds.value = normalizeDeptIds(payload.deptIds)
  deptNames.value = payload.deptNames ?? []
  activeTab.value = resolveActiveTab(payload.activeTab)
  formData.value = createDefaultFormData()
  teacherFormData.value = createDefaultTeacherFormData(payload.id, defaultTeacherDeptIds.value)
  postList.value = []
  roleList.value = []
  formRef.value?.clearValidate()
  teacherFormRef.value?.clearValidate()
  formLoading.value = true
  try {
    const [user, roleIds, posts, roles, teacher] = await Promise.all([
      UserApi.getUser(payload.id) as Promise<UserApi.UserVO & { remark?: string; avatar?: string }>,
      canAssignRole
        ? (PermissionApi.getUserRoleList(payload.id) as Promise<number[]>)
        : Promise.resolve([] as number[]),
      canEditBasic ? PostApi.getSimplePostList() : Promise.resolve([] as PostApi.PostVO[]),
      canAssignRole ? RoleApi.getSimpleRoleList() : Promise.resolve([] as RoleApi.RoleVO[]),
      canManageTeacher ? EduApi.getTeacherByUserId(payload.id) : Promise.resolve(null)
    ])
    postList.value = posts
    roleList.value = roles
    formData.value = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      remark: user.remark ?? '',
      deptId: user.deptId,
      postIds: (user.postIds as unknown as number[]) ?? [],
      mobile: user.mobile ?? '',
      email: user.email ?? '',
      sex: user.sex,
      avatar: user.avatar ?? '',
      roleIds
    }
    teacherFormData.value = teacher
      ? {
          ...teacher,
          userId: user.id,
          teacherNo: teacher.teacherNo ?? '',
          title: teacher.title ?? '',
          hireDate: teacher.hireDate ?? '',
          employmentStatus: teacher.employmentStatus ?? '',
          deptIds: normalizeDeptIds(teacher.deptIds).length
            ? normalizeDeptIds(teacher.deptIds)
            : defaultTeacherDeptIds.value,
          remark: teacher.remark ?? '',
          extraJson: teacher.extraJson ?? ''
        }
      : createDefaultTeacherFormData(user.id, defaultTeacherDeptIds.value)
  } finally {
    formLoading.value = false
  }
}

defineExpose({ open })

const getTeacherDeptIds = () => {
  const teacherDeptIds = normalizeDeptIds(teacherFormData.value.deptIds)
  return teacherDeptIds.length ? teacherDeptIds : defaultTeacherDeptIds.value
}

const buildTeacherPayload = (): EduApi.EduTeacherVO => ({
  ...teacherFormData.value,
  userId: formData.value.id,
  deptIds: getTeacherDeptIds(),
  teacherNo: teacherFormData.value.teacherNo ?? '',
  title: teacherFormData.value.title ?? '',
  hireDate: teacherFormData.value.hireDate ?? '',
  employmentStatus: teacherFormData.value.employmentStatus ?? '',
  remark: teacherFormData.value.remark ?? '',
  extraJson: teacherFormData.value.extraJson ?? ''
})

const submitForm = async () => {
  if (!canEditBasic && !canAssignRole && !canManageTeacher) {
    message.warning('当前没有可操作权限')
    return
  }
  if (canEditBasic) {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) {
      activeTab.value = 'basic'
      return
    }
  }
  const needSaveTeacher = canManageTeacher && shouldSaveTeacher()
  if (needSaveTeacher) {
    if (teacherFormData.value.id && !canUpdateTeacher) {
      activeTab.value = 'teacher'
      message.warning('当前没有修改教师扩展权限')
      return
    }
    if (!teacherFormData.value.id && !canCreateTeacher) {
      activeTab.value = 'teacher'
      message.warning('当前没有新增教师扩展权限')
      return
    }
    const valid = await teacherFormRef.value?.validate().catch(() => false)
    if (!valid) {
      activeTab.value = 'teacher'
      return
    }
    if (!getTeacherDeptIds().length) {
      activeTab.value = 'teacher'
      message.warning('当前用户未分配组织，请先在列表页添加到部门')
      return
    }
  }
  submitLoading.value = true
  try {
    if (canEditBasic) {
      await OrgStructureApi.updateUser({
        id: formData.value.id,
        username: formData.value.username,
        nickname: formData.value.nickname,
        remark: formData.value.remark,
        deptId: formData.value.deptId,
        postIds: formData.value.postIds,
        mobile: formData.value.mobile,
        email: formData.value.email,
        sex: formData.value.sex,
        avatar: formData.value.avatar
      })
    }
    if (canAssignRole) {
      await PermissionApi.assignUserRole({
        userId: formData.value.id,
        roleIds: formData.value.roleIds
      })
    }
    if (needSaveTeacher) {
      const payload = buildTeacherPayload()
      if (payload.id) {
        await EduApi.updateTeacher(payload)
      } else {
        await EduApi.createTeacher(payload)
      }
    }
    message.success('保存成功')
    dialogVisible.value = false
    emit('success')
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.org-user-edit-dialog {
  min-height: 240px;
}

.dept-summary {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

.dept-summary__label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dept-summary__tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
