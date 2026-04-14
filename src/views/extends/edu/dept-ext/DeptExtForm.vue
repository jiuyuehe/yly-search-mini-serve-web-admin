<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="上级组织" prop="parentId">
        <DeptExtTreeSelect v-model="formData.parentId" placeholder="不选则为根节点" class="!w-100%" />
      </el-form-item>
      <el-form-item label="组织名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入组织名称" />
      </el-form-item>
      <el-form-item label="业务类型" prop="bizType">
        <el-select v-model="formData.bizType" class="!w-100%" clearable placeholder="请选择业务类型">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_DEPT_BIZ_TYPE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="显示排序" prop="sort">
        <el-input-number v-model="formData.sort" :min="0" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="负责人" prop="leaderUserId">
        <el-select v-model="formData.leaderUserId" class="!w-100%" clearable filterable placeholder="请选择负责人">
          <el-option
            v-for="item in userOptions"
            :key="item.id"
            :label="`${item.nickname || item.username}（${item.username}）`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="formData.phone" placeholder="请输入联系电话" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="formData.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item v-if="showGradeFields" label="年级编码" prop="gradeCode">
        <el-input v-model="formData.gradeCode" placeholder="请输入年级编码" />
      </el-form-item>
      <el-form-item v-if="showGradeFields" label="所属学段" prop="gradeStage">
        <el-select v-model="formData.gradeStage" class="!w-100%" clearable placeholder="请选择学段">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_GRADE_STAGE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="showClassFields" label="班级编码" prop="classCode">
        <el-input v-model="formData.classCode" placeholder="请输入班级编码" />
      </el-form-item>
      <el-form-item v-if="showClassFields" label="人数上限" prop="studentLimit">
        <el-input-number v-model="formData.studentLimit" :min="0" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)" :key="dict.value" :value="dict.value">
            {{ dict.label }}
          </el-radio>
        </el-radio-group>
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
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { CommonStatusEnum } from '@/utils/constants'
import * as EduApi from '@/api/extends/edu'
import * as UserApi from '@/api/system/user'
import { FormRules } from 'element-plus'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduDeptExtForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const userOptions = ref<UserApi.UserVO[]>([])
const formData = ref<EduApi.EduDeptExtVO>({
  name: '',
  parentId: undefined,
  sort: 0,
  leaderUserId: undefined,
  phone: '',
  email: '',
  status: CommonStatusEnum.ENABLE,
  bizType: '',
  gradeCode: '',
  gradeStage: undefined,
  classCode: '',
  studentLimit: undefined,
  remark: '',
  extraJson: ''
})
const formRules = reactive<FormRules>({
  name: [{ required: true, message: '组织名称不能为空', trigger: 'blur' }],
  sort: [{ required: true, message: '显示排序不能为空', trigger: 'change' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }],
  bizType: [{ required: true, message: '业务类型不能为空', trigger: 'change' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }]
})

const showGradeFields = computed(() => ['grade', 'class'].includes(formData.value.bizType || ''))
const showClassFields = computed(() => formData.value.bizType === 'class')

watch(
  () => formData.value.bizType,
  (value) => {
    if (!['grade', 'class'].includes(value || '')) {
      formData.value.gradeCode = ''
      formData.value.gradeStage = undefined
    }
    if (value !== 'class') {
      formData.value.classCode = ''
      formData.value.studentLimit = undefined
    }
  }
)

const resetForm = () => {
  formData.value = {
    name: '',
    parentId: undefined,
    sort: 0,
    leaderUserId: undefined,
    phone: '',
    email: '',
    status: CommonStatusEnum.ENABLE,
    bizType: '',
    gradeCode: '',
    gradeStage: undefined,
    classCode: '',
    studentLimit: undefined,
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
      formData.value = await EduApi.getDeptExt(id)
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
      await EduApi.createDeptExt(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateDeptExt(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
