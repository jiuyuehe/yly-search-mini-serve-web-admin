<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="关联章节" prop="chapterId">
        <el-select v-model="formData.chapterId" class="!w-100%" clearable filterable placeholder="请选择章节">
          <el-option v-for="item in chapterOptions" :key="item.id" :label="chapterLabel(item)" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="知识点" prop="knowledgePointId">
        <el-select v-model="formData.knowledgePointId" class="!w-100%" clearable filterable placeholder="请选择知识点">
          <el-option v-for="item in filteredKnowledgeOptions" :key="item.id" :label="knowledgeLabel(item)" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="教学要求" prop="teachingRequirement">
        <el-input v-model="formData.teachingRequirement" placeholder="请输入教学要求" />
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
import * as EduApi from '@/api/extends/edu'
import { FormRules } from 'element-plus'

defineOptions({ name: 'EduChapterKnowledgePointForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const chapterOptions = ref<EduApi.EduChapterVO[]>([])
const knowledgeOptions = ref<EduApi.EduKnowledgePointVO[]>([])
const textbookOptions = ref<EduApi.EduTextbookVO[]>([])
const formData = ref<EduApi.EduChapterKnowledgePointVO>({
  chapterId: undefined as unknown as number,
  knowledgePointId: undefined as unknown as number,
  teachingRequirement: '',
  sortOrder: 0,
  remark: ''
})
const formRules = reactive<FormRules>({
  chapterId: [{ required: true, message: '关联章节不能为空', trigger: 'change' }],
  knowledgePointId: [{ required: true, message: '知识点不能为空', trigger: 'change' }]
})

const textbookCourseMap = computed(() => {
  const map = new Map<number, number>()
  textbookOptions.value.forEach((item) => {
    if (item.id) {
      map.set(item.id, item.courseId)
    }
  })
  return map
})

const filteredKnowledgeOptions = computed(() => {
  const chapter = chapterOptions.value.find((item) => item.id === formData.value.chapterId)
  if (!chapter) {
    return knowledgeOptions.value
  }
  const courseId = textbookCourseMap.value.get(chapter.textbookId)
  if (!courseId) {
    return knowledgeOptions.value
  }
  return knowledgeOptions.value.filter((item) => item.courseId === courseId)
})

const chapterLabel = (item: EduApi.EduChapterVO) => `${'　'.repeat(Math.max((item.levelNo || 1) - 1, 0))}${item.name}`
const knowledgeLabel = (item: EduApi.EduKnowledgePointVO) => item.name

const resetForm = () => {
  formData.value = {
    chapterId: undefined as unknown as number,
    knowledgePointId: undefined as unknown as number,
    teachingRequirement: '',
    sortOrder: 0,
    remark: ''
  }
  formRef.value?.resetFields()
}

const loadOptions = async () => {
  textbookOptions.value = await EduApi.getTextbookSimpleList()
  chapterOptions.value = await EduApi.getChapterList()
  knowledgeOptions.value = await EduApi.getKnowledgePointList()
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
      formData.value = await EduApi.getChapterKnowledgePoint(id)
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
      await EduApi.createChapterKnowledgePoint(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateChapterKnowledgePoint(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
