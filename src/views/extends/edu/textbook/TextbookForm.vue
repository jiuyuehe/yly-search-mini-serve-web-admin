<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="所属课程" prop="courseId">
        <el-select v-model="formData.courseId" class="!w-100%" clearable filterable placeholder="请选择课程">
          <el-option v-for="item in courseOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="教材名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入教材名称" />
      </el-form-item>
      <el-form-item label="教材编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入教材编码" />
      </el-form-item>
      <el-form-item label="出版社" prop="publisher">
        <el-input v-model="formData.publisher" placeholder="请输入出版社" />
      </el-form-item>
      <el-form-item label="ISBN" prop="isbn">
        <el-input v-model="formData.isbn" placeholder="请输入 ISBN" />
      </el-form-item>
      <el-form-item label="版本名称" prop="versionName">
        <el-input v-model="formData.versionName" placeholder="请输入版本名称" />
      </el-form-item>
      <el-form-item label="册序号" prop="volumeNo">
        <el-input-number v-model="formData.volumeNo" :min="1" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="出版日期" prop="publishDate">
        <el-date-picker v-model="formData.publishDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择出版日期" />
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
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { CommonStatusEnum } from '@/utils/constants'
import * as EduApi from '@/api/extends/edu'
import { FormRules } from 'element-plus'

defineOptions({ name: 'EduTextbookForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const courseOptions = ref<EduApi.EduCourseVO[]>([])
const formData = ref<EduApi.EduTextbookVO>({
  courseId: undefined as unknown as number,
  name: '',
  code: '',
  publisher: '',
  isbn: '',
  versionName: '',
  volumeNo: 1,
  publishDate: '',
  status: CommonStatusEnum.ENABLE,
  remark: ''
})
const formRules = reactive<FormRules>({
  courseId: [{ required: true, message: '所属课程不能为空', trigger: 'change' }],
  name: [{ required: true, message: '教材名称不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    courseId: undefined as unknown as number,
    name: '',
    code: '',
    publisher: '',
    isbn: '',
    versionName: '',
    volumeNo: 1,
    publishDate: '',
    status: CommonStatusEnum.ENABLE,
    remark: ''
  }
  formRef.value?.resetFields()
}

const loadCourseOptions = async () => {
  courseOptions.value = await EduApi.getCourseSimpleList()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadCourseOptions()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getTextbook(id)
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
      await EduApi.createTextbook(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateTextbook(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
