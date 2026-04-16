<template>
  <Dialog v-model="dialogVisible" title="新增用户" width="860px">
    <div v-loading="formLoading" class="org-user-create-dialog">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="88px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户昵称" prop="nickname">
              <el-input v-model="formData.nickname" placeholder="请输入用户昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="用户名称" prop="username">
              <el-input v-model="formData.username" placeholder="请输入用户名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户密码" prop="password">
              <el-input
                v-model="formData.password"
                type="password"
                show-password
                placeholder="请输入用户密码"
              />
            </el-form-item>
          </el-col>
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
            <el-form-item label="岗位" prop="postIds">
              <el-select
                v-model="formData.postIds"
                multiple
                filterable
                clearable
                collapse-tags
                collapse-tags-tooltip
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
          <el-col :span="12">
            <el-form-item v-if="canAssignRole" label="角色" prop="roleIds">
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
          </el-col>
        </el-row>

        <el-form-item label="所属部门" prop="deptIds">
          <el-tree-select
            v-model="formData.deptIds"
            :data="props.deptTreeOptions"
            :props="treeSelectProps"
            node-key="id"
            multiple
            filterable
            clearable
            show-checkbox
            check-strictly
            check-on-click-node
            :render-after-expand="false"
            default-expand-all
            collapse-tags
            collapse-tags-tooltip
            class="!w-100%"
            placeholder="请选择所属部门"
          />
          <div class="form-tip">支持多选，保存后会同步为用户的部门归属。</div>
        </el-form-item>

<!--        <el-form-item label="主部门" prop="deptId">-->
<!--          <el-select-->
<!--            v-model="formData.deptId"-->
<!--            class="!w-100%"-->
<!--            clearable-->
<!--            filterable-->
<!--            :disabled="selectedDeptOptions.length === 0"-->
<!--            placeholder="请从已选部门中指定主部门"-->
<!--          >-->
<!--            <el-option-->
<!--              v-for="item in selectedDeptOptions"-->
<!--              :key="item.id"-->
<!--              :label="item.name"-->
<!--              :value="item.id"-->
<!--            />-->
<!--          </el-select>-->
<!--          <div class="form-tip">主部门会写入系统用户档案，建议与当前操作部门保持一致。</div>-->
<!--        </el-form-item>-->

        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button :loading="submitLoading" type="primary" @click="submitForm">确定</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import * as PermissionApi from '@/api/system/permission'
import * as PostApi from '@/api/system/post'
import * as RoleApi from '@/api/system/role'
import * as UserApi from '@/api/system/user'
import * as OrgStructureApi from '@/api/extends/orgStructure'
import { CommonStatusEnum } from '@/utils/constants'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { checkPermi } from '@/utils/permission'

defineOptions({ name: 'OrgStructureUserCreateDialog' })

type Props = {
  deptTreeOptions: OrgStructureApi.OrgDeptVO[]
}

type OpenPayload = {
  defaultDeptId?: number
}

type FormData = {
  nickname: string
  deptId: number | undefined
  deptIds: number[]
  mobile: string
  email: string
  username: string
  password: string
  sex: number | undefined
  postIds: number[]
  remark: string
  status: number
  roleIds: number[]
}

type CreateUserReq = {
  nickname: string
  deptId?: number
  mobile?: string
  email?: string
  username: string
  password: string
  sex?: number
  postIds: number[]
  remark?: string
  status: number
}

const props = defineProps<Props>()

const message = useMessage()
const emit = defineEmits(['success'])

const canAssignRole = checkPermi(['system:permission:assign-user-role'])

const dialogVisible = ref(false)
const formLoading = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const postList = ref<PostApi.PostVO[]>([])
const roleList = ref<RoleApi.RoleVO[]>([])

const treeSelectProps = {
  label: 'name',
  children: 'children',
  value: 'id'
}

const createDefaultFormData = (defaultDeptId?: number): FormData => ({
  nickname: '',
  deptId: defaultDeptId,
  deptIds: defaultDeptId ? [defaultDeptId] : [],
  mobile: '',
  email: '',
  username: '',
  password: '',
  sex: undefined,
  postIds: [],
  remark: '',
  status: CommonStatusEnum.ENABLE,
  roleIds: []
})

const formData = ref<FormData>(createDefaultFormData())

const deptMap = computed(() => {
  const map = new Map<number, OrgStructureApi.OrgDeptVO>()
  const stack = [...props.deptTreeOptions]
  while (stack.length) {
    const current = stack.shift()
    if (!current) {
      continue
    }
    map.set(current.id, current)
    if (current.children?.length) {
      stack.push(...current.children)
    }
  }
  return map
})

const selectedDeptOptions = computed(() =>
  formData.value.deptIds
    .map((deptId) => deptMap.value.get(deptId))
    .filter((item): item is OrgStructureApi.OrgDeptVO => !!item)
)

const formRules: FormRules = {
  username: [{ required: true, message: '用户名称不能为空', trigger: 'blur' }],
  nickname: [{ required: true, message: '用户昵称不能为空', trigger: 'blur' }],
  password: [{ required: true, message: '用户密码不能为空', trigger: 'blur' }],
  deptId: [
    {
      validator: (_rule, value, callback) => {
        if (formData.value.deptIds.length > 0 && !value) {
          callback(new Error('请选择主部门'))
          return
        }
        callback()
      },
      trigger: 'change'
    }
  ],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }],
  mobile: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号码',
      trigger: 'blur'
    }
  ]
}

const normalizeDeptIds = (deptIds?: number[]) =>
  Array.from(
    new Set((deptIds ?? []).filter((deptId): deptId is number => typeof deptId === 'number'))
  )

const isSameDeptIds = (source: number[], target: number[]) =>
  source.length === target.length && source.every((deptId, index) => deptId === target[index])

const syncPrimaryDept = (deptIds?: number[]) => {
  const normalizedDeptIds = normalizeDeptIds(deptIds)
  if (!isSameDeptIds(formData.value.deptIds, normalizedDeptIds)) {
    formData.value.deptIds = normalizedDeptIds
  }
  if (!normalizedDeptIds.length) {
    formData.value.deptId = undefined
    return
  }
  if (!formData.value.deptId || !normalizedDeptIds.includes(formData.value.deptId)) {
    formData.value.deptId = normalizedDeptIds[0]
  }
}

const buildCreatePayload = (): CreateUserReq => ({
  nickname: formData.value.nickname,
  deptId: formData.value.deptId,
  mobile: formData.value.mobile || undefined,
  email: formData.value.email || undefined,
  username: formData.value.username,
  password: formData.value.password,
  sex: formData.value.sex,
  postIds: formData.value.postIds,
  remark: formData.value.remark || undefined,
  status: formData.value.status
})

const resetForm = (defaultDeptId?: number) => {
  formData.value = createDefaultFormData(defaultDeptId)
  nextTick(() => formRef.value?.clearValidate())
}

watch(
  () => formData.value.deptIds.slice(),
  (deptIds) => {
    syncPrimaryDept(deptIds)
  }
)

const open = async (payload?: OpenPayload) => {
  dialogVisible.value = true
  resetForm(payload?.defaultDeptId)
  postList.value = []
  roleList.value = []
  formLoading.value = true
  try {
    const [posts, roles] = await Promise.all([
      PostApi.getSimplePostList(),
      canAssignRole ? RoleApi.getSimpleRoleList() : Promise.resolve([] as RoleApi.RoleVO[])
    ])
    postList.value = posts
    roleList.value = roles
  } finally {
    formLoading.value = false
  }
}

defineExpose({ open })

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitLoading.value = true
  try {
    const userId = await UserApi.createUser(buildCreatePayload() as unknown as UserApi.UserVO)
    if (formData.value.deptIds.length) {
      await OrgStructureApi.updateUserDepartments(userId, formData.value.deptIds)
    }
    if (canAssignRole) {
      await PermissionApi.assignUserRole({
        userId,
        roleIds: formData.value.roleIds
      })
    }
    message.success('新增成功')
    dialogVisible.value = false
    emit('success')
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.org-user-create-dialog {
  min-height: 320px;
}

.form-tip {
  margin-top: 6px;
  line-height: 1.4;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
