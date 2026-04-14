<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="所属学年" prop="academicYearId">
        <el-select v-model="formData.academicYearId" class="!w-100%" clearable filterable placeholder="请选择学年">
          <el-option v-for="item in academicYearOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属学期" prop="semesterId">
        <el-select v-model="formData.semesterId" class="!w-100%" clearable filterable placeholder="请选择学期">
          <el-option v-for="item in semesterOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="任课教师" prop="teacherUserId">
        <el-select v-model="formData.teacherUserId" class="!w-100%" clearable filterable placeholder="请选择教师">
          <el-option v-for="item in teacherOptions" :key="item.userId" :label="`${item.nickname || item.username}（${item.teacherNo || item.userId}）`" :value="item.userId" />
        </el-select>
      </el-form-item>
      <el-form-item label="授课班级" prop="classDeptId">
        <DeptExtTreeSelect v-model="formData.classDeptId" :biz-types="['class']" placeholder="请选择班级" class="!w-100%" />
      </el-form-item>
      <el-form-item label="授课课程" prop="courseId">
        <el-select v-model="formData.courseId" class="!w-100%" clearable filterable placeholder="请选择课程">
          <el-option v-for="item in courseOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="班主任" prop="isMainTeacher">
        <el-switch v-model="formData.isMainTeacher" />
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
import * as EduApi from '@/api/extends/edu'
import { FormRules } from 'element-plus'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduAssignmentForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const academicYearOptions = ref<EduApi.EduAcademicYearVO[]>([])
const semesterOptions = ref<EduApi.EduSemesterVO[]>([])
const teacherOptions = ref<EduApi.EduTeacherVO[]>([])
const courseOptions = ref<EduApi.EduCourseVO[]>([])
const formData = ref<EduApi.EduTeacherAssignmentVO>({
  academicYearId: undefined as unknown as number,
  semesterId: undefined as unknown as number,
  teacherUserId: undefined as unknown as number,
  classDeptId: undefined as unknown as number,
  courseId: undefined as unknown as number,
  isMainTeacher: false,
  remark: ''
})
const formRules = reactive<FormRules>({
  academicYearId: [{ required: true, message: '所属学年不能为空', trigger: 'change' }],
  semesterId: [{ required: true, message: '所属学期不能为空', trigger: 'change' }],
  teacherUserId: [{ required: true, message: '任课教师不能为空', trigger: 'change' }],
  classDeptId: [{ required: true, message: '授课班级不能为空', trigger: 'change' }],
  courseId: [{ required: true, message: '授课课程不能为空', trigger: 'change' }]
})

watch(
  () => formData.value.academicYearId,
  async (value) => {
    if (!value) {
      semesterOptions.value = []
      formData.value.semesterId = undefined as unknown as number
      return
    }
    semesterOptions.value = await EduApi.getSemesterSimpleList(value)
    if (!semesterOptions.value.find((item) => item.id === formData.value.semesterId)) {
      formData.value.semesterId = undefined as unknown as number
    }
  }
)

const resetForm = () => {
  formData.value = {
    academicYearId: undefined as unknown as number,
    semesterId: undefined as unknown as number,
    teacherUserId: undefined as unknown as number,
    classDeptId: undefined as unknown as number,
    courseId: undefined as unknown as number,
    isMainTeacher: false,
    remark: ''
  }
  semesterOptions.value = []
  formRef.value?.resetFields()
}

const loadOptions = async () => {
  academicYearOptions.value = await EduApi.getAcademicYearSimpleList()
  teacherOptions.value = await EduApi.getTeacherSimpleList()
  courseOptions.value = await EduApi.getCourseSimpleList()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadOptions()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getTeacherAssignment(id)
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
      await EduApi.createTeacherAssignment(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateTeacherAssignment(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
