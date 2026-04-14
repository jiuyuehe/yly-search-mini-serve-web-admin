<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="所属教材" prop="textbookId">
        <el-select v-model="formData.textbookId" class="!w-100%" clearable filterable placeholder="请选择教材">
          <el-option v-for="item in textbookOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="父级章节" prop="parentId">
        <el-tree-select v-model="formData.parentId" :data="chapterTree" :props="defaultProps" check-strictly clearable placeholder="不选则为根章节" />
      </el-form-item>
      <el-form-item label="章节名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入章节名称" />
      </el-form-item>
      <el-form-item label="章节编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入章节编码" />
      </el-form-item>
      <el-form-item label="排序号" prop="sortOrder">
        <el-input-number v-model="formData.sortOrder" :min="0" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="起始页码" prop="pageStart">
        <el-input-number v-model="formData.pageStart" :min="0" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="结束页码" prop="pageEnd">
        <el-input-number v-model="formData.pageEnd" :min="0" controls-position="right" class="!w-100%" />
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
import { defaultProps, handleTree } from '@/utils/tree'
import { FormRules } from 'element-plus'

defineOptions({ name: 'EduChapterForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const textbookOptions = ref<EduApi.EduTextbookVO[]>([])
const chapterOptions = ref<EduApi.EduChapterVO[]>([])
const formData = ref<EduApi.EduChapterVO>({
  textbookId: undefined as unknown as number,
  parentId: undefined,
  name: '',
  code: '',
  sortOrder: 0,
  pageStart: undefined,
  pageEnd: undefined,
  remark: ''
})
const formRules = reactive<FormRules>({
  textbookId: [{ required: true, message: '所属教材不能为空', trigger: 'change' }],
  name: [{ required: true, message: '章节名称不能为空', trigger: 'blur' }]
})

const chapterTree = computed(() =>
  handleTree(
    chapterOptions.value.filter((item) => item.id !== formData.value.id),
    'id',
    'parentId'
  )
)

watch(
  () => formData.value.textbookId,
  async (value) => {
    if (!value) {
      chapterOptions.value = []
      formData.value.parentId = undefined
      return
    }
    chapterOptions.value = await EduApi.getChapterList({ textbookId: value })
    if (!chapterOptions.value.find((item) => item.id === formData.value.parentId)) {
      formData.value.parentId = undefined
    }
  }
)

const resetForm = () => {
  formData.value = {
    textbookId: undefined as unknown as number,
    parentId: undefined,
    name: '',
    code: '',
    sortOrder: 0,
    pageStart: undefined,
    pageEnd: undefined,
    remark: ''
  }
  chapterOptions.value = []
  formRef.value?.resetFields()
}

const loadTextbooks = async () => {
  textbookOptions.value = await EduApi.getTextbookSimpleList()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadTextbooks()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getChapter(id)
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
      await EduApi.createChapter(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateChapter(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
