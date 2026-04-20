<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
      <el-form-item label="结果类型">
        <el-select v-model="queryParams.taskType" class="!w-220px" placeholder="请选择结果类型">
          <el-option v-for="item in taskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="文件名称">
        <el-input v-model="queryParams.fileName" class="!w-220px" clearable placeholder="请输入文件名称" />
      </el-form-item>
      <el-form-item v-if="queryParams.taskType === 'form_extract'" label="表单ID">
        <el-input-number v-model="queryParams.formId" class="!w-180px" :controls="false" :min="1" />
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
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="文件名称" prop="fileName" min-width="240" show-overflow-tooltip />
      <el-table-column label="文档ID" prop="esId" min-width="220" show-overflow-tooltip />
      <el-table-column label="结果类型" prop="taskType" width="140">
        <template #default="{ row }">
          {{ taskTypeLabel(row.taskType) }}
        </template>
      </el-table-column>
      <el-table-column label="结果预览" prop="resultPreview" min-width="360" show-overflow-tooltip />
      <el-table-column label="更新时间" prop="updatedAt" width="180" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-drawer v-model="detailVisible" title="AI 结果详情" size="52%">
    <template v-if="detailRow">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="文件名称">{{ detailRow.fileName }}</el-descriptions-item>
        <el-descriptions-item label="文档ID">{{ detailRow.esId }}</el-descriptions-item>
        <el-descriptions-item label="结果类型">{{ taskTypeLabel(detailRow.taskType) }}</el-descriptions-item>
      </el-descriptions>
      <el-card class="!mt-16px" shadow="never">
        <pre class="result-json">{{ formattedDetail }}</pre>
      </el-card>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { AiResultApi } from '@/api/rag/ai-result'

defineOptions({ name: 'RagAiResult' })

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detailRow = ref<any>()
const detailData = ref<any>()
const queryFormRef = ref()

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  taskType: 'summary',
  fileName: undefined,
  formId: undefined
})

const taskTypeOptions = [
  { label: '摘要', value: 'summary' },
  { label: '文档分类', value: 'document_classify' },
  { label: 'NER', value: 'ner' },
  { label: '翻译', value: 'translate' },
  { label: '表单抽取', value: 'form_extract' }
]

const getList = async () => {
  loading.value = true
  try {
    const data = await AiResultApi.getPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.taskType = 'summary'
  handleQuery()
}

const openDetail = async (row: any) => {
  detailRow.value = row
  detailData.value = await AiResultApi.getDetail(row.taskType, row.esId, queryParams.formId)
  detailVisible.value = true
}

const taskTypeLabel = (value?: string) => {
  return taskTypeOptions.find((item) => item.value === value)?.label || value || '-'
}

const formattedDetail = computed(() => JSON.stringify(detailData.value || {}, null, 2))

onMounted(() => {
  getList()
})
</script>

<style scoped>
.result-json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.65;
}
</style>
