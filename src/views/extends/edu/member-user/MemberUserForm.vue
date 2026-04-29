<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
    <div v-loading="formLoading">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="用户信息" name="basic">
          <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
            <el-form-item label="手机号" prop="mobile">
              <el-input v-model="formData.mobile" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item v-if="formType === 'create'" label="登录密码" prop="password">
              <el-input
                v-model="formData.password"
                placeholder="请输入登录密码"
                show-password
                type="password"
              />
            </el-form-item>
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="formData.status">
                <el-radio
                  v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
                  :key="dict.value"
                  :value="dict.value"
                >
                  {{ dict.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="用户昵称" prop="nickname">
              <el-input v-model="formData.nickname" placeholder="请输入用户昵称" />
            </el-form-item>
            <el-form-item label="头像" prop="avatar">
              <UploadImg v-model="formData.avatar" :limit="1" :is-show-tip="false" />
            </el-form-item>
            <el-form-item label="真实姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入真实姓名" />
            </el-form-item>
            <el-form-item label="用户性别" prop="sex">
              <el-radio-group v-model="formData.sex">
                <el-radio
                  v-for="dict in getIntDictOptions(DICT_TYPE.SYSTEM_USER_SEX)"
                  :key="dict.value"
                  :value="dict.value"
                >
                  {{ dict.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="出生日期" prop="birthday">
              <el-date-picker
                v-model="formData.birthday"
                type="date"
                value-format="x"
                placeholder="请选择出生日期"
              />
            </el-form-item>
            <el-form-item label="所在地" prop="areaId">
              <el-tree-select
                v-model="formData.areaId"
                :data="areaList"
                :props="defaultProps"
                :render-after-expand="true"
                class="!w-100%"
              />
            </el-form-item>
            <el-form-item label="用户标签" prop="tagIds">
              <MemberTagSelect v-model="formData.tagIds" show-add />
            </el-form-item>
            <el-form-item label="用户分组" prop="groupId">
              <MemberGroupSelect v-model="formData.groupId" />
            </el-form-item>
            <el-form-item label="会员备注" prop="mark">
              <el-input v-model="formData.mark" type="textarea" placeholder="请输入会员备注" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="showStudentTab" label="学生扩展" name="student">
          <el-form
            ref="studentFormRef"
            :model="studentFormData"
            :rules="studentFormRules"
            label-width="100px"
          >
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="学号" prop="studentNo">
                  <el-input v-model="studentFormData.studentNo" placeholder="请输入学号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="学籍状态" prop="studentStatus">
                  <el-select
                    v-model="studentFormData.studentStatus"
                    class="!w-100%"
                    clearable
                    placeholder="请选择学籍状态"
                  >
                    <el-option
                      v-for="dict in getStrDictOptions(DICT_TYPE.EDU_STUDENT_STATUS)"
                      :key="dict.value"
                      :label="dict.label"
                      :value="dict.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="所属班级" prop="classDeptId">
              <DeptExtTreeSelect
                v-model="studentFormData.classDeptId"
                :biz-types="['class']"
                placeholder="请选择班级"
                class="!w-100%"
              />
            </el-form-item>
            <el-form-item label="入学日期" prop="enrollmentDate">
              <el-date-picker
                v-model="studentFormData.enrollmentDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择入学日期"
              />
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="监护人姓名" prop="guardianName">
                  <el-input v-model="studentFormData.guardianName" placeholder="请输入监护人姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="监护人手机" prop="guardianPhone">
                  <el-input
                    v-model="studentFormData.guardianPhone"
                    placeholder="请输入监护人手机号"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="备注" prop="remark">
              <el-input v-model="studentFormData.remark" type="textarea" placeholder="请输入备注" />
            </el-form-item>
            <el-form-item label="扩展 JSON" prop="extraJson">
              <el-input
                v-model="studentFormData.extraJson"
                type="textarea"
                placeholder="请输入扩展 JSON"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <el-button type="primary" :disabled="formLoading" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import * as EduApi from '@/api/extends/edu'
import * as AreaApi from '@/api/system/area'
import { defaultProps } from '@/utils/tree'
import { checkPermi } from '@/utils/permission'
import MemberTagSelect from '@/views/member/tag/components/MemberTagSelect.vue'
import MemberGroupSelect from '@/views/member/group/components/MemberGroupSelect.vue'
import type { FormRules } from 'element-plus'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduMemberUserForm' })

const { t } = useI18n()
const message = useMessage()

const MOBILE_REG = /^1\d{10}$/
const PASSWORD_REG = /^[^<>"'|\\]+$/

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const activeTab = ref<'basic' | 'student'>('basic')
const formRef = ref()
const studentFormRef = ref()
const areaList = ref([])
const canQueryStudent = checkPermi(['edu:student:query'])
const canCreateStudent = checkPermi(['edu:student:create'])
const canUpdateStudent = checkPermi(['edu:student:update'])
const canManageStudent = canQueryStudent && (canCreateStudent || canUpdateStudent)
const showStudentTab = computed(() => formType.value !== 'create' && canManageStudent)
const formData = ref<EduApi.EduMemberUserVO>({
  id: undefined,
  mobile: '',
  password: '',
  status: 0,
  nickname: '',
  avatar: '',
  name: '',
  sex: undefined,
  areaId: undefined,
  birthday: undefined,
  mark: '',
  tagIds: [],
  levelId: undefined,
  groupId: undefined
})
const createDefaultStudentFormData = (memberUserId = 0): EduApi.EduStudentVO => ({
  memberUserId,
  studentNo: '',
  classDeptId: undefined,
  studentStatus: '',
  enrollmentDate: '',
  guardianName: '',
  guardianPhone: '',
  remark: '',
  extraJson: ''
})

const studentFormData = ref<EduApi.EduStudentVO>(createDefaultStudentFormData())

const validateMobile = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('手机号不能为空'))
    return
  }
  if (!MOBILE_REG.test(value)) {
    callback(new Error('手机号格式不正确'))
    return
  }
  callback()
}

const validatePassword = (_rule: any, value: string, callback: any) => {
  if (formType.value !== 'create') {
    callback()
    return
  }
  if (!value) {
    callback(new Error('密码不能为空'))
    return
  }
  if (value.length < 5 || value.length > 20) {
    callback(new Error('用户密码长度必须介于 5 和 20 之间'))
    return
  }
  if (!PASSWORD_REG.test(value)) {
    callback(new Error('密码不能包含非法字符'))
    return
  }
  callback()
}

const formRules = reactive<FormRules>({
  mobile: [{ validator: validateMobile, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }],
  nickname: [{ required: true, message: '用户昵称不能为空', trigger: 'blur' }]
})

function isFilled(value?: string | number | null) {
  return `${value ?? ''}`.trim().length > 0
}

function hasStudentInput() {
  const data = studentFormData.value
  return (
    isFilled(data.studentNo) ||
    isFilled(data.classDeptId) ||
    isFilled(data.studentStatus) ||
    isFilled(data.enrollmentDate) ||
    isFilled(data.guardianName) ||
    isFilled(data.guardianPhone) ||
    isFilled(data.remark) ||
    isFilled(data.extraJson)
  )
}

function shouldSaveStudent() {
  return Boolean(studentFormData.value.id || hasStudentInput())
}

const validateStudentNo = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (shouldSaveStudent() && !isFilled(value)) {
    callback(new Error('学号不能为空'))
    return
  }
  callback()
}

const validateStudentStatus = (
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void
) => {
  if (shouldSaveStudent() && !isFilled(value)) {
    callback(new Error('学籍状态不能为空'))
    return
  }
  callback()
}

const studentFormRules = reactive<FormRules>({
  studentNo: [{ validator: validateStudentNo, trigger: 'blur' }],
  studentStatus: [{ validator: validateStudentStatus, trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    id: undefined,
    mobile: '',
    password: '',
    status: 0,
    nickname: '',
    avatar: '',
    name: '',
    sex: undefined,
    areaId: undefined,
    birthday: undefined,
    mark: '',
    tagIds: [],
    levelId: undefined,
    groupId: undefined
  }
  studentFormData.value = createDefaultStudentFormData()
  activeTab.value = 'basic'
  formRef.value?.resetFields()
  studentFormRef.value?.resetFields()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  areaList.value = await AreaApi.getAreaTree()
  if (id) {
    formLoading.value = true
    try {
      const [memberUser, student] = await Promise.all([
        EduApi.getMemberUser(id),
        canManageStudent ? EduApi.getStudentByMemberUserId(id) : Promise.resolve(null)
      ])
      formData.value = memberUser
      formData.value.password = ''
      studentFormData.value = student
        ? {
            ...student,
            memberUserId: id,
            studentNo: student.studentNo ?? '',
            classDeptId: student.classDeptId,
            studentStatus: student.studentStatus ?? '',
            enrollmentDate: student.enrollmentDate ?? '',
            guardianName: student.guardianName ?? '',
            guardianPhone: student.guardianPhone ?? '',
            remark: student.remark ?? '',
            extraJson: student.extraJson ?? ''
          }
        : createDefaultStudentFormData(id)
    } finally {
      formLoading.value = false
    }
  }
}

defineExpose({ open })

const emit = defineEmits(['success'])

const buildStudentPayload = (memberUserId: number): EduApi.EduStudentVO => ({
  ...studentFormData.value,
  memberUserId,
  studentNo: studentFormData.value.studentNo ?? '',
  classDeptId: studentFormData.value.classDeptId,
  studentStatus: studentFormData.value.studentStatus ?? '',
  enrollmentDate: studentFormData.value.enrollmentDate ?? '',
  guardianName: studentFormData.value.guardianName ?? '',
  guardianPhone: studentFormData.value.guardianPhone ?? '',
  remark: studentFormData.value.remark ?? '',
  extraJson: studentFormData.value.extraJson ?? ''
})

const submitForm = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) {
    activeTab.value = 'basic'
    return
  }
  const needSaveStudent = canManageStudent && shouldSaveStudent()
  if (needSaveStudent) {
    if (studentFormData.value.id && !canUpdateStudent) {
      activeTab.value = 'student'
      message.warning('当前没有修改学生扩展权限')
      return
    }
    if (!studentFormData.value.id && !canCreateStudent) {
      activeTab.value = 'student'
      message.warning('当前没有新增学生扩展权限')
      return
    }
    const studentValid = await studentFormRef.value?.validate().catch(() => false)
    if (!studentValid) {
      activeTab.value = 'student'
      return
    }
  }
  formLoading.value = true
  try {
    const payload = { ...formData.value }
    let memberUserId = payload.id
    if (formType.value === 'create') {
      memberUserId = await EduApi.createMemberUser(payload)
    } else {
      delete payload.password
      await EduApi.updateMemberUser(payload)
    }
    if (needSaveStudent && memberUserId) {
      const studentPayload = buildStudentPayload(memberUserId)
      if (studentPayload.id) {
        await EduApi.updateStudent(studentPayload)
      } else {
        await EduApi.createStudent(studentPayload)
      }
    }
    message.success(
      formType.value === 'create' ? t('common.createSuccess') : t('common.updateSuccess')
    )
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
