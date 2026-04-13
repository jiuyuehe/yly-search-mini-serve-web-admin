<template>
  <ContentWrap>
    <div class="header-row">
      <div>
        <div class="title">AI 任务日志</div>
        <div class="subtitle">统一查看 OCR、问答、摘要、翻译、表单抽取与推荐分类任务</div>
      </div>
      <div class="header-actions">
        <el-button @click="getList">
          <Icon icon="ep:refresh" class="mr-5px" />
          刷新
        </el-button>
        <el-button type="danger" plain :disabled="!selectedIds.length" @click="handleBatchDelete">
          <Icon icon="ep:delete" class="mr-5px" />
          批量删除
        </el-button>
      </div>
    </div>
  </ContentWrap>

  <ContentWrap>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">任务总数</div>
        <div class="stat-value">{{ statistics.total || 0 }}</div>
      </div>
      <div class="stat-card running">
        <div class="stat-label">运行中</div>
        <div class="stat-value">{{ getStatusCount('running') }}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">已完成</div>
        <div class="stat-value">{{ getStatusCount('completed') }}</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-label">失败</div>
        <div class="stat-value">{{ getStatusCount('failed') }}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">已取消</div>
        <div class="stat-value">{{ getStatusCount('cancelled') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均耗时</div>
        <div class="stat-value">{{ formatDuration(statistics.avgDurationMs) }}</div>
      </div>
    </div>
    <div class="trend-box">
      <span class="trend-title">近 7 日趋势</span>
      <div class="trend-list">
        <div v-for="item in statistics.recentTrend || []" :key="item.date" class="trend-item">
          <span>{{ item.date }}</span>
          <el-tag size="small" type="info">{{ item.count }}</el-tag>
        </div>
      </div>
    </div>
  </ContentWrap>

  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="82px">
      <el-form-item label="任务类型" prop="taskType">
        <el-select v-model="queryParams.taskType" class="!w-200px" clearable placeholder="请选择任务类型">
          <el-option v-for="item in taskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="任务状态" prop="status">
        <el-select v-model="queryParams.status" class="!w-200px" clearable placeholder="请选择任务状态">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户名称" prop="userName">
        <el-input v-model="queryParams.userName" class="!w-200px" clearable placeholder="支持模糊查询" />
      </el-form-item>
      <el-form-item label="文件名称" prop="fileName">
        <el-input v-model="queryParams.fileName" class="!w-240px" clearable placeholder="支持模糊查询" />
      </el-form-item>
      <el-form-item label="文档ID" prop="esId">
        <el-input v-model="queryParams.esId" class="!w-240px" clearable placeholder="请输入 esId" />
      </el-form-item>
      <el-form-item label="用户ID" prop="userId">
        <el-input-number v-model="queryParams.userId" class="!w-200px" :min="0" :controls="false" />
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          class="!w-320px"
          clearable
          end-placeholder="结束时间"
          start-placeholder="开始时间"
          type="daterange"
          value-format="YYYY-MM-DD"
        />
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
    <el-table v-loading="loading" :data="list" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" />
      <el-table-column label="任务ID" prop="taskId" min-width="220" show-overflow-tooltip />
      <el-table-column label="任务类型" prop="taskType" width="130">
        <template #default="{ row }">
          <el-tag>{{ formatTaskType(row.taskType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="子类型" prop="taskSubType" width="140" show-overflow-tooltip />
      <el-table-column label="状态" prop="status" width="110">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ formatStatus(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="文件名称" prop="fileName" min-width="180" show-overflow-tooltip />
      <el-table-column label="用户名称" prop="userName" width="120" />
      <el-table-column label="引擎" prop="engine" width="110" />
      <el-table-column label="耗时" prop="durationMs" width="120">
        <template #default="{ row }">
          {{ formatDuration(row.durationMs) }}
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createTime" width="180">
        <template #default="{ row }">
          {{ formatTimestamp(row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleDetail(row.taskId)">详情</el-button>
          <el-button link type="danger" @click="handleDelete(row.taskId)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <el-drawer v-model="detailVisible" title="任务详情" size="42%">
    <template v-if="detail">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="任务ID">{{ detail.taskId }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ formatTaskType(detail.taskType) }}</el-descriptions-item>
        <el-descriptions-item label="任务子类型">{{ detail.taskSubType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detail.status)">{{ formatStatus(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="文档ID">{{ detail.esId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="文件名称">{{ detail.fileName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ detail.userName || '-' }} / {{ detail.userId ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="模型ID">{{ detail.modelId ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="引擎">{{ detail.engine || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求地址">{{ detail.requestUri || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatTimestamp(detail.startTime) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ formatTimestamp(detail.endTime) }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ formatDuration(detail.durationMs) }}</el-descriptions-item>
        <el-descriptions-item label="详情">{{ detail.detail || '-' }}</el-descriptions-item>
        <el-descriptions-item label="错误信息">{{ detail.errorMessage || '-' }}</el-descriptions-item>
      </el-descriptions>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { useMessage } from '@/hooks/web/useMessage'
import { AiTaskLogApi, AiTaskLogVO } from '@/api/rag/aitasklog'
import { reactive, ref, onMounted } from 'vue'

defineOptions({ name: 'RagAiTaskLog' })

const message = useMessage()
const loading = ref(false)
const detailVisible = ref(false)
const list = ref<AiTaskLogVO[]>([])
const detail = ref<AiTaskLogVO | null>(null)
const total = ref(0)
const selectedIds = ref<string[]>([])
const queryFormRef = ref()

const statistics = ref<any>({
  total: 0,
  statusStats: {},
  taskTypeStats: {},
  avgDurationMs: 0,
  recentTrend: []
})

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  esId: undefined as string | undefined,
  userId: undefined as number | undefined,
  taskType: undefined as string | undefined,
  status: undefined as string | undefined,
  fileName: undefined as string | undefined,
  userName: undefined as string | undefined,
  createTime: [] as string[]
})

const taskTypeOptions = [
  { label: '摘要', value: 'summary' },
  { label: '标签', value: 'tags' },
  { label: '问答', value: 'qa' },
  { label: 'NER', value: 'ner' },
  { label: '表单抽取', value: 'form_extract' },
  { label: 'OCR', value: 'ocr' },
  { label: '关联推荐', value: 'related_recommend' },
  { label: '文档分类', value: 'document_classify' },
  { label: '翻译', value: 'translate' }
]

const statusOptions = [
  { label: '已创建', value: 'created' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
  { label: '已取消', value: 'cancelled' }
]

const getList = async () => {
  loading.value = true
  try {
    const [pageRes, statRes] = await Promise.all([
      AiTaskLogApi.getPage(queryParams as any),
      AiTaskLogApi.getStatistics(queryParams as any)
    ])
    list.value = pageRes.list || []
    total.value = pageRes.total || 0
    statistics.value = statRes || {}
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = async () => {
  queryFormRef.value?.resetFields()
  queryParams.pageNo = 1
  await getList()
}

const handleSelectionChange = (rows: AiTaskLogVO[]) => {
  selectedIds.value = rows.map((item) => item.taskId)
}

const handleDetail = async (taskId: string) => {
  detail.value = await AiTaskLogApi.get(taskId)
  detailVisible.value = true
}

const handleDelete = async (taskId: string) => {
  await ElMessageBox.confirm('确定删除这条 AI 任务日志吗？', '删除确认', { type: 'warning' })
  await AiTaskLogApi.delete(taskId)
  message.success('删除成功')
  await getList()
}

const handleBatchDelete = async () => {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条任务日志吗？`, '批量删除确认', {
    type: 'warning'
  })
  await AiTaskLogApi.deleteBatch(selectedIds.value)
  selectedIds.value = []
  message.success('批量删除成功')
  await getList()
}

const getStatusCount = (status: string) => {
  return statistics.value?.statusStats?.[status] || 0
}

const formatTaskType = (value?: string) => {
  return taskTypeOptions.find((item) => item.value === value)?.label || value || '-'
}

const formatStatus = (value?: string) => {
  return statusOptions.find((item) => item.value === value)?.label || value || '-'
}

const statusTagType = (value?: string) => {
  if (value === 'completed') return 'success'
  if (value === 'running') return 'primary'
  if (value === 'failed') return 'danger'
  if (value === 'cancelled') return 'warning'
  return 'info'
}

const formatTimestamp = (value?: number) => {
  if (!value) return '-'
  const date = new Date(value)
  const pad = (num: number) => `${num}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const formatDuration = (value?: number) => {
  if (!value && value !== 0) return '-'
  if (value < 1000) return `${value} ms`
  if (value < 60000) return `${(value / 1000).toFixed(1)} s`
  return `${(value / 60000).toFixed(1)} min`
}

onMounted(() => {
  getList()
})
</script>

<style scoped lang="scss">
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2a37;
}

.subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f7f8fa 0%, #eef2f7 100%);
  border: 1px solid #e5e7eb;
}

.stat-card.success {
  background: linear-gradient(135deg, #effaf3 0%, #dff6e8 100%);
}

.stat-card.running {
  background: linear-gradient(135deg, #eef6ff 0%, #ddeeff 100%);
}

.stat-card.warning {
  background: linear-gradient(135deg, #fff8eb 0%, #ffefcf 100%);
}

.stat-card.danger {
  background: linear-gradient(135deg, #fff1f2 0%, #ffe1e4 100%);
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.stat-value {
  margin-top: 10px;
  font-size: 26px;
  font-weight: 700;
  color: #111827;
}

.trend-box {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px dashed #d1d5db;
}

.trend-title {
  display: inline-block;
  margin-bottom: 10px;
  color: #374151;
  font-weight: 600;
}

.trend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.trend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
}
</style>
