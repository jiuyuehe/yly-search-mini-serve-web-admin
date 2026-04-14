<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="所属学年" prop="academicYearId">
        <el-select v-model="formData.academicYearId" class="!w-100%" clearable filterable placeholder="请选择学年">
          <el-option v-for="item in academicYearOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="学期名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入学期名称" />
      </el-form-item>
      <el-form-item label="学期编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入学期编码" />
      </el-form-item>
      <el-form-item label="学期序号" prop="semesterNo">
        <el-input-number v-model="formData.semesterNo" :min="1" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="开始日期" prop="startDate">
        <el-date-picker v-model="formData.startDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择开始日期" />
      </el-form-item>
      <el-form-item label="结束日期" prop="endDate">
        <el-date-picker v-model="formData.endDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择结束日期" />
      </el-form-item>
      <el-form-item label="当前学期" prop="isCurrent">
        <el-switch v-model="formData.isCurrent" />
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
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { CommonStatusEnum } from '@/utils/constants'
import * as EduApi from '@/api/extends/edu'
import { FormRules } from 'element-plus'

defineOptions({ name: 'EduSemesterForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const academicYearOptions = ref<EduApi.EduAcademicYearVO[]>([])
const formData = ref<EduApi.EduSemesterVO>({
  academicYearId: undefined as unknown as number,
  name: '',
  code: '',
  semesterNo: 1,
  startDate: '',
  endDate: '',
  isCurrent: false,
  status: CommonStatusEnum.ENABLE,
  remark: ''
})
const formRules = reactive<FormRules>({
  academicYearId: [{ required: true, message: '所属学年不能为空', trigger: 'change' }],
  name: [{ required: true, message: '学期名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '学期编码不能为空', trigger: 'blur' }],
  semesterNo: [{ required: true, message: '学期序号不能为空', trigger: 'change' }],
  startDate: [{ required: true, message: '开始日期不能为空', trigger: 'change' }],
  endDate: [{ required: true, message: '结束日期不能为空', trigger: 'change' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    academicYearId: undefined as unknown as number,
    name: '',
    code: '',
    semesterNo: 1,
    startDate: '',
    endDate: '',
    isCurrent: false,
    status: CommonStatusEnum.ENABLE,
    remark: ''
  }
  formRef.value?.resetFields()
}

const loadAcademicYears = async () => {
  academicYearOptions.value = await EduApi.getAcademicYearSimpleList()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadAcademicYears()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getSemester(id)
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
      await EduApi.createSemester(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateSemester(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
