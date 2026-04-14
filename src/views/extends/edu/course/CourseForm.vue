<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="课程名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入课程名称" />
      </el-form-item>
      <el-form-item label="课程编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入课程编码" />
      </el-form-item>
      <el-form-item label="课程分类" prop="category">
        <el-input v-model="formData.category" placeholder="请输入课程分类" />
      </el-form-item>
      <el-form-item label="适用学段" prop="stage">
        <el-select v-model="formData.stage" class="!w-100%" clearable placeholder="请选择适用学段">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_COURSE_STAGE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="学分" prop="credit">
        <el-input-number v-model="formData.credit" :min="0" :precision="1" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="总课时" prop="totalHours">
        <el-input-number v-model="formData.totalHours" :min="0" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="周课时" prop="hoursPerWeek">
        <el-input-number v-model="formData.hoursPerWeek" :min="0" controls-position="right" class="!w-100%" />
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
import { FormRules } from 'element-plus'

defineOptions({ name: 'EduCourseForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const formData = ref<EduApi.EduCourseVO>({
  name: '',
  code: '',
  category: '',
  stage: undefined,
  credit: undefined,
  totalHours: undefined,
  hoursPerWeek: undefined,
  status: CommonStatusEnum.ENABLE,
  remark: ''
})
const formRules = reactive<FormRules>({
  name: [{ required: true, message: '课程名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '课程编码不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    name: '',
    code: '',
    category: '',
    stage: undefined,
    credit: undefined,
    totalHours: undefined,
    hoursPerWeek: undefined,
    status: CommonStatusEnum.ENABLE,
    remark: ''
  }
  formRef.value?.resetFields()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getCourse(id)
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
      await EduApi.createCourse(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateCourse(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
