<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="会员用户" prop="memberUserId">
        <el-select
          v-model="formData.memberUserId"
          class="!w-100%"
          clearable
          filterable
          remote
          reserve-keyword
          :remote-method="loadMemberUsers"
          :loading="memberUserLoading"
          placeholder="请输入昵称或手机号搜索"
        >
          <el-option
            v-for="item in memberUserOptions"
            :key="item.id"
            :label="`${item.nickname || item.name || '会员'}（${item.mobile || item.id}）`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="学号" prop="studentNo">
        <el-input v-model="formData.studentNo" placeholder="请输入学号" />
      </el-form-item>
      <el-form-item label="所属班级" prop="classDeptId">
        <DeptExtTreeSelect v-model="formData.classDeptId" :biz-types="['class']" placeholder="请选择班级" class="!w-100%" />
      </el-form-item>
      <el-form-item label="学籍状态" prop="studentStatus">
        <el-select v-model="formData.studentStatus" class="!w-100%" clearable placeholder="请选择学籍状态">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_STUDENT_STATUS)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="入学日期" prop="enrollmentDate">
        <el-date-picker v-model="formData.enrollmentDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择入学日期" />
      </el-form-item>
      <el-form-item label="监护人姓名" prop="guardianName">
        <el-input v-model="formData.guardianName" placeholder="请输入监护人姓名" />
      </el-form-item>
      <el-form-item label="监护人手机" prop="guardianPhone">
        <el-input v-model="formData.guardianPhone" placeholder="请输入监护人手机号" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="formData.remark" type="textarea" placeholder="请输入备注" />
      </el-form-item>
      <el-form-item label="扩展 JSON" prop="extraJson">
        <el-input v-model="formData.extraJson" type="textarea" placeholder="请输入扩展 JSON" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" :disabled="formLoading" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import * as EduApi from '@/api/extends/edu'
import * as MemberUserApi from '@/api/member/user'
import { FormRules } from 'element-plus'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduStudentForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const memberUserLoading = ref(false)
const formType = ref('')
const formRef = ref()
const memberUserOptions = ref<any[]>([])
const formData = ref<EduApi.EduStudentVO>({
  memberUserId: undefined as unknown as number,
  studentNo: '',
  classDeptId: undefined,
  studentStatus: '',
  enrollmentDate: '',
  guardianName: '',
  guardianPhone: '',
  remark: '',
  extraJson: ''
})
const formRules = reactive<FormRules>({
  memberUserId: [{ required: true, message: '会员用户不能为空', trigger: 'change' }],
  studentNo: [{ required: true, message: '学号不能为空', trigger: 'blur' }],
  studentStatus: [{ required: true, message: '学籍状态不能为空', trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    memberUserId: undefined as unknown as number,
    studentNo: '',
    classDeptId: undefined,
    studentStatus: '',
    enrollmentDate: '',
    guardianName: '',
    guardianPhone: '',
    remark: '',
    extraJson: ''
  }
  formRef.value?.resetFields()
}

const loadMemberUsers = async (keyword?: string) => {
  memberUserLoading.value = true
  try {
    const data = await MemberUserApi.getUserPage({
      pageNo: 1,
      pageSize: 20,
      nickname: keyword || undefined,
      mobile: keyword || undefined
    })
    memberUserOptions.value = data.list || []
  } finally {
    memberUserLoading.value = false
  }
}

const ensureMemberUserOption = async (id?: number) => {
  if (!id) return
  const exists = memberUserOptions.value.find((item) => item.id === id)
  if (exists) return
  const data = await MemberUserApi.getUser(id)
  if (data) {
    memberUserOptions.value = [data, ...memberUserOptions.value]
  }
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadMemberUsers()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getStudent(id)
      await ensureMemberUserOption(formData.value.memberUserId)
    } finally {
      formLoading.value = false
    }
  }
}

defineExpose({ open })

const emit = defineEmits(['success'])

const submitForm = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return
  formLoading.value = true
  try {
    if (formType.value === 'create') {
      await EduApi.createStudent(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateStudent(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
