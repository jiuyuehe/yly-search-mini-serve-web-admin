<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
      <el-form-item label="任务名称">
        <el-input v-model="queryParams.taskName" class="!w-220px" clearable placeholder="请输入任务名称" />
      </el-form-item>
      <el-form-item label="任务类型">
        <el-select v-model="queryParams.aiTaskType" class="!w-180px" clearable placeholder="请选择任务类型">
          <el-option v-for="item in aiTaskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryParams.status" class="!w-180px" clearable placeholder="请选择状态">
          <el-option label="启用" :value="1" />
          <el-option label="暂停" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px" />
          重置
        </el-button>
        <el-button type="primary" plain @click="openDialog()">
          <Icon icon="ep:plus" class="mr-5px" />
          新建 AI 定时任务
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="任务名称" prop="taskName" min-width="180" show-overflow-tooltip />
      <el-table-column label="AI 功能" prop="aiTaskType" width="140">
        <template #default="{ row }">
          {{ aiTaskTypeLabel(row.aiTaskType) }}
        </template>
      </el-table-column>
      <el-table-column label="文件类型" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ formatGroupLabels(row.formatGroups).join('、') || '全部' }}
        </template>
      </el-table-column>
      <el-table-column label="Cron" prop="cronExpression" min-width="180" show-overflow-tooltip />
      <el-table-column label="成功/失败/跳过" width="180">
        <template #default="{ row }">
          {{ row.successCount || 0 }}/{{ row.failureCount || 0 }}/{{ row.skipCount || 0 }}
        </template>
      </el-table-column>
      <el-table-column label="最后执行时间" prop="lastExecuteTime" width="180" />
      <el-table-column label="状态" prop="status" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'warning'">
            {{ row.status === 1 ? '启用' : '暂停' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" min-width="260">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="success" @click="handleTrigger(row.id)">立即执行</el-button>
          <el-button link :type="row.status === 1 ? 'warning' : 'primary'" @click="toggleStatus(row)">
            {{ row.status === 1 ? '暂停' : '启用' }}
          </el-button>
          <el-button link type="info" @click="goToTaskLog(row.id)">查看日志</el-button>
          <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="dialogVisible" :title="formData.id ? '编辑 AI 定时任务' : '新建 AI 定时任务'" width="760px">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="104px">
      <el-form-item label="任务名称" prop="taskName">
        <el-input v-model="formData.taskName" placeholder="例如：PDF 摘要定时处理" />
      </el-form-item>
      <el-form-item label="任务描述" prop="taskDesc">
        <el-input v-model="formData.taskDesc" type="textarea" :rows="2" placeholder="可选，说明这条任务做什么" />
      </el-form-item>
      <el-form-item label="扫描任务范围">
        <el-select v-model="formData.scanTaskIds" class="!w-full" clearable collapse-tags collapse-tags-tooltip filterable multiple placeholder="可多选，不选默认全量">
          <el-option v-for="item in scanTaskOptions" :key="item.id" :label="item.taskName" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源类型">
        <el-checkbox-group v-model="formData.sourceTypes">
          <el-checkbox label="db">云盘 DB</el-checkbox>
          <el-checkbox label="nas">NAS</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="文件类型">
        <el-select v-model="formData.formatGroups" class="!w-full" collapse-tags collapse-tags-tooltip filterable multiple placeholder="请选择文件类型">
          <el-option v-for="item in formatGroupOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="扩展名过滤">
        <el-input v-model="fileExtInput" placeholder="高级筛选，多个扩展名用英文逗号分隔，如 docx,pdf,java" />
      </el-form-item>
      <el-form-item label="AI 功能" prop="aiTaskType">
        <el-select v-model="formData.aiTaskType" class="!w-full" placeholder="请选择 AI 功能">
          <el-option v-for="item in aiTaskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item :label="formData.aiTaskType === 'embedding' ? 'Embedding模型' : '模型'">
        <el-select v-model="formData.modelId" class="!w-full" clearable filterable :placeholder="formData.aiTaskType === 'embedding' ? '请选择 type=5 向量模型' : '可选'">
          <el-option v-for="item in currentModelOptions" :key="item.id" :label="`${item.name}${item.model ? `（${item.model}）` : ''}`" :value="item.id" />
        </el-select>
      </el-form-item>
      <template v-if="formData.aiTaskType === 'embedding'">
        <el-form-item label="Reranker模型">
          <el-select v-model="formData.rerankModelId" class="!w-full" clearable filterable placeholder="可选，推荐 Qwen/Qwen3-VL-Reranker-2B">
            <el-option v-for="item in rerankModelOptions" :key="item.id" :label="`${item.name}${item.model ? `（${item.model}）` : ''}`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="向量目标">
          <el-radio-group v-model="formData.embeddingTarget">
            <el-radio-button label="image">图片</el-radio-button>
            <el-radio-button label="text">文本</el-radio-button>
            <el-radio-button label="all">全部</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="覆盖已有向量">
          <el-switch v-model="formData.embeddingOverwrite" />
        </el-form-item>
        <el-form-item label="批处理大小">
          <el-input-number v-model="formData.embeddingBatchSize" :min="1" :max="500" />
        </el-form-item>
      </template>
      <el-form-item v-if="formData.aiTaskType !== 'embedding'" label="角色">
        <el-select v-model="formData.roleId" class="!w-full" clearable filterable placeholder="可选">
          <el-option v-for="item in roleOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="formData.aiTaskType === 'translate'" label="目标语言">
        <el-input v-model="formData.targetLang" placeholder="例如：en、zh-CN、ja" />
      </el-form-item>
      <el-form-item v-if="formData.aiTaskType === 'form_extract'" label="表单">
        <el-select v-model="formData.formId" class="!w-full" clearable filterable placeholder="请选择表单">
          <el-option v-for="item in formOptions" :key="item.id" :label="item.name || item.formName || item.id" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Cron 表达式" prop="cronExpression">
        <el-input v-model="formData.cronExpression" placeholder="例如：0 0/30 * * * ? / 0 0 2 * * ?" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { AiScheduleTaskApi, AiScheduleTaskVO } from '@/api/rag/ai-schedule'
import { ControlTaskApi } from '@/api/rag/controltask'
import { AiFormApi } from '@/api/rag/ai-form'
import { ModelApi } from '@/api/ai/model/model'
import { ChatRoleApi } from '@/api/ai/model/chatRole'

defineOptions({ name: 'RagAiSchedule' })

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const modelOptions = ref<any[]>([])
const embeddingModelOptions = ref<any[]>([])
const rerankModelOptions = ref<any[]>([])
const roleOptions = ref<any[]>([])
const scanTaskOptions = ref<any[]>([])
const formOptions = ref<any[]>([])
const queryFormRef = ref()
const formRef = ref()
const fileExtInput = ref('')

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  taskName: undefined,
  status: undefined,
  aiTaskType: undefined
})

const defaultFormData = (): AiScheduleTaskVO => ({
  taskName: '',
  taskDesc: '',
  sourceTypes: ['db', 'nas'],
  scanTaskIds: [],
  formatGroups: [],
  fileExts: [],
  aiTaskType: 'summary',
  embeddingTarget: 'image',
  embeddingOverwrite: false,
  embeddingBatchSize: 50,
  cronExpression: '0 0 2 * * ?'
})

const formData = reactive<AiScheduleTaskVO>(defaultFormData())

const rules = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  aiTaskType: [{ required: true, message: '请选择 AI 功能', trigger: 'change' }],
  cronExpression: [{ required: true, message: '请输入 Cron 表达式', trigger: 'blur' }]
}

const aiTaskTypeOptions = [
  { label: '摘要', value: 'summary' },
  { label: 'OCR', value: 'ocr' },
  { label: '标签', value: 'tags' },
  { label: '分类', value: 'document_classify' },
  { label: 'NER', value: 'ner' },
  { label: '翻译', value: 'translate' },
  { label: '表单抽取', value: 'form_extract' },
  { label: '向量化 / Embedding', value: 'embedding' }
]

const formatGroupOptions = [
  { label: 'Office', value: 'office' },
  { label: 'PDF', value: 'pdf' },
  { label: '文本', value: 'text' },
  { label: '代码', value: 'code' },
  { label: '脚本', value: 'script' },
  { label: '图片', value: 'image' },
  { label: '音频', value: 'audio' },
  { label: '视频', value: 'video' },
  { label: '压缩包', value: 'archive' },
  { label: '设计图', value: 'design' },
  { label: '邮件', value: 'email' },
  { label: '日志', value: 'log' },
  { label: '其他', value: 'other' }
]

const getList = async () => {
  loading.value = true
  try {
    const data = await AiScheduleTaskApi.getPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const loadOptions = async () => {
  const [taskPage, models, embeddingModels, rerankModels, roles, forms] = await Promise.all([
    ControlTaskApi.getControlTaskPage({ pageNo: 1, pageSize: 200 }),
    ModelApi.getModelSimpleList(),
    ModelApi.getModelSimpleList(5),
    ModelApi.getModelSimpleList(6),
    ChatRoleApi.getChatRolePage({ pageNo: 1, pageSize: 100 }),
    AiFormApi.getPage({ pageNo: 1, pageSize: 100 })
  ])
  scanTaskOptions.value = taskPage.list || []
  modelOptions.value = models || []
  embeddingModelOptions.value = embeddingModels || []
  rerankModelOptions.value = rerankModels || []
  roleOptions.value = roles.list || roles.records || []
  formOptions.value = forms.list || []
}

const currentModelOptions = computed(() => {
  return formData.aiTaskType === 'embedding' ? embeddingModelOptions.value : modelOptions.value
})

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

const openDialog = (row?: any) => {
  Object.assign(formData, defaultFormData(), row || {})
  fileExtInput.value = (row?.fileExts || []).join(',')
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    formData.fileExts = fileExtInput.value
      ? fileExtInput.value.split(',').map((item) => item.trim()).filter(Boolean)
      : []
    if (formData.id) {
      await AiScheduleTaskApi.update(formData)
      message.success('更新成功')
    } else {
      await AiScheduleTaskApi.create(formData)
      message.success('创建成功')
    }
    dialogVisible.value = false
    await getList()
  } finally {
    submitLoading.value = false
  }
}

const handleTrigger = async (id: number) => {
  await AiScheduleTaskApi.trigger(id)
  message.success('触发成功')
  await getList()
}

const toggleStatus = async (row: any) => {
  const targetStatus = row.status === 1 ? 2 : 1
  await AiScheduleTaskApi.updateStatus({ id: row.id, status: targetStatus })
  message.success(targetStatus === 1 ? '已启用' : '已暂停')
  await getList()
}

const handleDelete = async (id: number) => {
  await message.delConfirm()
  await AiScheduleTaskApi.delete(id)
  message.success('删除成功')
  await getList()
}

const goToTaskLog = (scheduleTaskId: number) => {
  router.push({ path: '/rag/apps/ai-task-log', query: { scheduleTaskId: String(scheduleTaskId) } })
}

const aiTaskTypeLabel = (value?: string) => {
  return aiTaskTypeOptions.find((item) => item.value === value)?.label || value || '-'
}

const formatGroupLabels = (values?: string[]) => {
  return (values || []).map((item) => formatGroupOptions.find((option) => option.value === item)?.label || item)
}

onMounted(async () => {
  await Promise.all([loadOptions(), getList()])
})
</script>
