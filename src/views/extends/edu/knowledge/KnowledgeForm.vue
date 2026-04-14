<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="所属课程" prop="courseId">
        <el-select v-model="formData.courseId" class="!w-100%" clearable filterable placeholder="请选择课程">
          <el-option v-for="item in courseOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="父级知识点" prop="parentId">
        <el-tree-select v-model="formData.parentId" :data="pointTree" :props="defaultProps" check-strictly clearable placeholder="不选则为根节点" />
      </el-form-item>
      <el-form-item label="知识点名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入知识点名称" />
      </el-form-item>
      <el-form-item label="知识点编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入知识点编码" />
      </el-form-item>
      <el-form-item label="适用学段" prop="stage">
        <el-select v-model="formData.stage" class="!w-100%" clearable placeholder="请选择适用学段">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_COURSE_STAGE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="难度" prop="difficulty">
        <el-input v-model="formData.difficulty" placeholder="请输入难度" />
      </el-form-item>
      <el-form-item label="关键词" prop="keywords">
        <el-input v-model="formData.keywords" placeholder="请输入关键词，多个用逗号分隔" />
      </el-form-item>
      <el-form-item label="排序号" prop="sortOrder">
        <el-input-number v-model="formData.sortOrder" :min="0" controls-position="right" class="!w-100%" />
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
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import * as EduApi from '@/api/extends/edu'
import { defaultProps, handleTree } from '@/utils/tree'
import { FormRules } from 'element-plus'

defineOptions({ name: 'EduKnowledgeForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const courseOptions = ref<EduApi.EduCourseVO[]>([])
const pointOptions = ref<EduApi.EduKnowledgePointVO[]>([])
const formData = ref<EduApi.EduKnowledgePointVO>({
  courseId: undefined as unknown as number,
  parentId: undefined,
  name: '',
  code: '',
  stage: undefined,
  difficulty: '',
  keywords: '',
  sortOrder: 0,
  remark: ''
})
const formRules = reactive<FormRules>({
  courseId: [{ required: true, message: '所属课程不能为空', trigger: 'change' }],
  name: [{ required: true, message: '知识点名称不能为空', trigger: 'blur' }]
})

const pointTree = computed(() =>
  handleTree(
    pointOptions.value.filter((item) => item.id !== formData.value.id),
    'id',
    'parentId'
  )
)

watch(
  () => formData.value.courseId,
  async (value) => {
    if (!value) {
      pointOptions.value = []
      formData.value.parentId = undefined
      return
    }
    pointOptions.value = await EduApi.getKnowledgePointList({ courseId: value })
    if (!pointOptions.value.find((item) => item.id === formData.value.parentId)) {
      formData.value.parentId = undefined
    }
  }
)

const resetForm = () => {
  formData.value = {
    courseId: undefined as unknown as number,
    parentId: undefined,
    name: '',
    code: '',
    stage: undefined,
    difficulty: '',
    keywords: '',
    sortOrder: 0,
    remark: ''
  }
  pointOptions.value = []
  formRef.value?.resetFields()
}

const loadCourses = async () => {
  courseOptions.value = await EduApi.getCourseSimpleList()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadCourses()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getKnowledgePoint(id)
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
      await EduApi.createKnowledgePoint(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateKnowledgePoint(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
