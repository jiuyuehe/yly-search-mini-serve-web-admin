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
import * as OrgStructureApi from '@/api/extends/orgStructure'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { checkPermi } from '@/utils/permission'

defineOptions({ name: 'OrgStructureUserEditDialog' })

type OpenPayload = {
  id: number
  deptNames?: string[]
  activeTab?: 'basic' | 'role'
}

type FormData = OrgStructureApi.OrgUserUpdateReq & {
  roleIds: number[]
}

const message = useMessage()
const emit = defineEmits(['success'])

const canEditBasic = checkPermi(['system:user:update'])
const canAssignRole = checkPermi(['system:permission:assign-user-role'])

const dialogVisible = ref(false)
const formLoading = ref(false)
const submitLoading = ref(false)
const activeTab = ref<'basic' | 'role'>('basic')
const deptNames = ref<string[]>([])
const formRef = ref<FormInstance>()
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

const resolveActiveTab = (tab?: 'basic' | 'role') => {
  if (tab === 'role' && canAssignRole) {
    return 'role'
  }
  if (canEditBasic) {
    return 'basic'
  }
  return 'role'
}

const open = async (payload: OpenPayload) => {
  dialogVisible.value = true
  deptNames.value = payload.deptNames ?? []
  activeTab.value = resolveActiveTab(payload.activeTab)
  formData.value = createDefaultFormData()
  postList.value = []
  roleList.value = []
  formRef.value?.clearValidate()
  formLoading.value = true
  try {
    const [user, roleIds, posts, roles] = await Promise.all([
      UserApi.getUser(payload.id) as Promise<UserApi.UserVO & { remark?: string; avatar?: string }>,
      canAssignRole
        ? (PermissionApi.getUserRoleList(payload.id) as Promise<number[]>)
        : Promise.resolve([] as number[]),
      canEditBasic ? PostApi.getSimplePostList() : Promise.resolve([] as PostApi.PostVO[]),
      canAssignRole ? RoleApi.getSimpleRoleList() : Promise.resolve([] as RoleApi.RoleVO[])
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
  } finally {
    formLoading.value = false
  }
}

defineExpose({ open })

const submitForm = async () => {
  if (!canEditBasic && !canAssignRole) {
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
