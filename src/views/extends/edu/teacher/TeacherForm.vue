<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="关联用户" prop="userId">
        <el-select v-model="formData.userId" class="!w-100%" clearable filterable :disabled="formType === 'update'" placeholder="请选择系统用户">
          <el-option
            v-for="item in userOptions"
            :key="item.id"
            :label="`${item.nickname || item.username}（${item.username}）`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="教师工号" prop="teacherNo">
        <el-input v-model="formData.teacherNo" placeholder="请输入教师工号" />
      </el-form-item>
      <el-form-item label="职称" prop="title">
        <el-input v-model="formData.title" placeholder="请输入职称" />
      </el-form-item>
      <el-form-item label="入职日期" prop="hireDate">
        <el-date-picker v-model="formData.hireDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择入职日期" />
      </el-form-item>
      <el-form-item label="任职状态" prop="employmentStatus">
        <el-select v-model="formData.employmentStatus" class="!w-100%" clearable placeholder="请选择任职状态">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_TEACHER_EMPLOYMENT_STATUS)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属组织" prop="deptIds">
        <DeptExtTreeSelect v-model="formData.deptIds" multiple placeholder="请选择所属组织" class="!w-100%" />
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
import * as UserApi from '@/api/system/user'
import { FormRules } from 'element-plus'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduTeacherForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const userOptions = ref<UserApi.UserVO[]>([])
const formData = ref<EduApi.EduTeacherVO>({
  userId: undefined as unknown as number,
  teacherNo: '',
  title: '',
  hireDate: '',
  employmentStatus: '',
  deptIds: [],
  remark: '',
  extraJson: ''
})
const formRules = reactive<FormRules>({
  userId: [{ required: true, message: '关联用户不能为空', trigger: 'change' }],
  employmentStatus: [{ required: true, message: '任职状态不能为空', trigger: 'change' }],
  deptIds: [{ required: true, message: '所属组织不能为空', trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    userId: undefined as unknown as number,
    teacherNo: '',
    title: '',
    hireDate: '',
    employmentStatus: '',
    deptIds: [],
    remark: '',
    extraJson: ''
  }
  formRef.value?.resetFields()
}

const loadUsers = async () => {
  userOptions.value = await UserApi.getSimpleUserList()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadUsers()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getTeacher(id)
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
    const payload = {
      ...formData.value,
      deptIds: (formData.value.deptIds || []).filter((item): item is number => item !== null && item !== undefined)
    }
    if (formType.value === 'create') {
      await EduApi.createTeacher(payload)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateTeacher(payload)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
