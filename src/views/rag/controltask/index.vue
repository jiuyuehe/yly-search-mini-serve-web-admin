<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
      <el-form-item label="任务名称" prop="taskName">
        <el-input v-model="queryParams.taskName" class="!w-220px" clearable placeholder="请输入任务名称" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" class="!w-200px" clearable placeholder="请选择状态">
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.CONTROL_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
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
        <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['rag:control-task:create']">
          <Icon icon="ep:plus" class="mr-5px" />
          新增
        </el-button>
        <el-button type="success" plain @click="handleExport" :loading="exportLoading" v-hasPermi="['rag:control-task:export']">
          <Icon icon="ep:download" class="mr-5px" />
          导出
        </el-button>
        <el-button type="warning" plain @click="handleFormatGroupBackfill" :loading="backfillLoading" v-hasPermi="['rag:control-task:update']">
          <Icon icon="ep:operation" class="mr-5px" />
          formatGroup 回填
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="ID" prop="id" width="90" />
      <el-table-column label="任务名称" prop="taskName" min-width="180" show-overflow-tooltip />
      <el-table-column label="来源介质" min-width="120">
        <template #default="{ row }">
          {{ getStorageName(row.storageId) }}
        </template>
      </el-table-column>
      <el-table-column label="总文件数" prop="totalFiles" width="110" />
      <el-table-column label="基础信息" prop="basicFileInfoCount" width="110" />
      <el-table-column label="内容提取" prop="contentProcessedCount" width="110" />
      <el-table-column label="内容错误" prop="contentErrorCount" width="110" />
      <el-table-column label="状态" prop="status" width="110">
        <template #default="{ row }">
          <dict-tag :type="DICT_TYPE.CONTROL_STATUS" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="最后执行时间" prop="lastExecuteTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" min-width="320" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" v-if="row.status !== 2" :loading="actionLoading[row.id]" @click="handleStart(row)" v-hasPermi="['rag:control-task:update']">
            {{ row.lastExecuteTime ? '重新启动' : '启动' }}
          </el-button>
          <el-button link type="warning" v-if="row.status === 2" :loading="actionLoading[row.id]" @click="handlePause(row)" v-hasPermi="['rag:control-task:update']">
            停止
          </el-button>
          <el-button link type="primary" @click="openForm('update', row.id)" v-hasPermi="['rag:control-task:update']">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row.id)" v-hasPermi="['rag:control-task:delete']">删除</el-button>
          <el-button link type="success" @click="openAnalysis(row)">统计分析</el-button>
          <el-button link type="info" v-if="!isDatabaseStorage(row.storageId)" @click="handleReset(row)">重置</el-button>
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

  <ControlTaskForm ref="formRef" @success="getList" />

  <el-drawer v-model="analysisVisible" title="扫描任务分析中心" size="72%">
    <template v-if="currentTask">
      <div class="analysis-header">
        <div>
          <div class="analysis-title">{{ currentTask.taskName }}</div>
          <div class="analysis-subtitle">基础扫描与内容提取统计、格式分布、统一明细</div>
        </div>
        <div class="analysis-actions">
          <el-button @click="loadAnalysis(currentTask.id)">
            <Icon icon="ep:refresh" class="mr-5px" />
            刷新
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">文件总量</div>
          <div class="stat-value">{{ statistics.totalFiles || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">基础信息</div>
          <div class="stat-value">{{ statistics.basicFileInfoCount || 0 }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">内容提取成功</div>
          <div class="stat-value">{{ statistics.contentProcessedCount || 0 }}</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-label">内容提取失败</div>
          <div class="stat-value">{{ statistics.contentErrorCount || 0 }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">处理中</div>
          <div class="stat-value">{{ statistics.processingCount || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">等待中</div>
          <div class="stat-value">{{ statistics.waitingCount || 0 }}</div>
        </div>
      </div>

      <ContentWrap class="!mt-16px">
        <div class="format-toolbar">
          <div class="section-title">格式分类统计</div>
          <div class="section-tip">点击格式卡片可快速钻取对应文件明细</div>
        </div>
        <div class="format-grid">
          <div
            v-for="item in statistics.formatStats || []"
            :key="item.formatGroup"
            class="format-card"
            :class="{ active: detailQuery.formatGroup === item.formatGroup }"
            @click="filterByFormat(item.formatGroup)"
          >
            <div class="format-name">{{ formatGroupLabel(item.formatGroup) }}</div>
            <div class="format-count">{{ item.count || 0 }}</div>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap class="!mt-16px">
        <el-form :inline="true" :model="detailQuery" label-width="84px">
          <el-form-item label="文件名称">
            <el-input v-model="detailQuery.keyword" class="!w-240px" clearable placeholder="请输入文件名" />
          </el-form-item>
          <el-form-item label="总体状态">
            <el-select v-model="detailQuery.overallStatus" class="!w-180px" clearable placeholder="请选择状态">
              <el-option label="等待中" value="waiting" />
              <el-option label="处理中" value="processing" />
              <el-option label="成功" value="success" />
              <el-option label="失败" value="error" />
            </el-select>
          </el-form-item>
          <el-form-item label="格式分组">
            <el-select v-model="detailQuery.formatGroup" class="!w-180px" clearable placeholder="请选择格式分组">
              <el-option v-for="item in formatOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadDetailPage">
              <Icon icon="ep:search" class="mr-5px" />
              查询明细
            </el-button>
            <el-button @click="resetDetailQuery">
              <Icon icon="ep:refresh" class="mr-5px" />
              重置
            </el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="detailLoading" :data="detailList" stripe class="!mt-12px">
          <el-table-column label="文件名称" prop="fileName" min-width="220" show-overflow-tooltip />
          <el-table-column label="来源" prop="sourceType" width="100" />
          <el-table-column label="格式分组" prop="formatGroup" width="120">
            <template #default="{ row }">
              {{ formatGroupLabel(row.formatGroup) }}
            </template>
          </el-table-column>
          <el-table-column label="扩展名" prop="fileExt" width="100" />
          <el-table-column label="基础状态" prop="basicInfoStatus" width="100" />
          <el-table-column label="内容状态" prop="contentProcessStatus" width="100" />
          <el-table-column label="总体状态" prop="overallStatus" width="100" />
          <el-table-column label="文件大小" prop="fileSize" width="120" />
          <el-table-column label="错误原因" prop="errorReason" min-width="180" show-overflow-tooltip />
          <el-table-column label="最后更新时间" prop="lastModified" width="180" />
        </el-table>

        <Pagination
          :total="detailTotal"
          v-model:page="detailQuery.pageNo"
          v-model:limit="detailQuery.pageSize"
          @pagination="loadDetailPage"
        />
      </ContentWrap>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ControlTaskApi, ControlTaskVO } from '@/api/rag/controltask'
import { useStorageMediumCache } from '@/hooks/web/useStorageMediumCache'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import ControlTaskForm from './ControlTaskForm.vue'

defineOptions({ name: 'ControlTask' })

const message = useMessage()
const { t } = useI18n()
const { getStorageName, getStorageList } = useStorageMediumCache()

const loading = ref(false)
const exportLoading = ref(false)
const backfillLoading = ref(false)
const detailLoading = ref(false)
const list = ref<ControlTaskVO[]>([])
const total = ref(0)
const currentTask = ref<any>()
const statistics = ref<any>({})
const detailList = ref<any[]>([])
const detailTotal = ref(0)
const analysisVisible = ref(false)
const formRef = ref()
const queryFormRef = ref()
const storageList = ref<any[]>([])
const actionLoading = ref<Record<number, boolean>>({})

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  taskName: undefined,
  status: undefined
})

const detailQuery = reactive({
  id: undefined as number | undefined,
  pageNo: 1,
  pageSize: 10,
  keyword: undefined as string | undefined,
  overallStatus: undefined as string | undefined,
  formatGroup: undefined as string | undefined
})

const formatOptions = [
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
    const data = await ControlTaskApi.getControlTaskPage(queryParams)
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
  handleQuery()
}

const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

const openAnalysis = async (row: any) => {
  currentTask.value = row
  detailQuery.id = row.id
  detailQuery.pageNo = 1
  detailQuery.keyword = undefined
  detailQuery.overallStatus = undefined
  detailQuery.formatGroup = undefined
  analysisVisible.value = true
  await loadAnalysis(row.id)
}

const loadAnalysis = async (taskId: number) => {
  statistics.value = await ControlTaskApi.getControlTaskStatistics(taskId)
  await loadDetailPage()
}

const loadDetailPage = async () => {
  if (!detailQuery.id) return
  detailLoading.value = true
  try {
    const data = await ControlTaskApi.getUnifiedDetailPage(detailQuery)
    detailList.value = data.list || []
    detailTotal.value = data.total || 0
  } finally {
    detailLoading.value = false
  }
}

const resetDetailQuery = async () => {
  detailQuery.pageNo = 1
  detailQuery.keyword = undefined
  detailQuery.overallStatus = undefined
  detailQuery.formatGroup = undefined
  await loadDetailPage()
}

const filterByFormat = async (formatGroup: string) => {
  detailQuery.pageNo = 1
  detailQuery.formatGroup = detailQuery.formatGroup === formatGroup ? undefined : formatGroup
  await loadDetailPage()
}

const handleStart = async (row: any) => {
  if (actionLoading.value[row.id]) return
  if (row.lastExecuteTime) {
    try {
      await message.confirm('重新启动会重新扫描文件目录，请确认后继续。')
    } catch {
      return
    }
  }
  actionLoading.value[row.id] = true
  try {
    await ControlTaskApi.startControlTask({ id: row.id })
    message.success('启动成功')
    await getList()
  } finally {
    actionLoading.value[row.id] = false
  }
}

const handlePause = async (row: any) => {
  actionLoading.value[row.id] = true
  try {
    await ControlTaskApi.stopControlTask({ id: row.id })
    message.success('停止成功')
    await getList()
  } finally {
    actionLoading.value[row.id] = false
  }
}

const handleReset = async (row: any) => {
  await ControlTaskApi.resetTask({ id: row.id })
  message.success('重置成功')
  await getList()
}

const handleDelete = async (id: number) => {
  try {
    const task = list.value.find((item) => item.id === id)
    if (task?.status === 2) {
      message.warning('请先停止任务后再删除')
      return
    }
    await message.delConfirm()
    await ControlTaskApi.deleteControlTask(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await ControlTaskApi.exportControlTask(queryParams)
    download.excel(data, '扫描任务中心.xls')
  } finally {
    exportLoading.value = false
  }
}

const handleFormatGroupBackfill = async () => {
  try {
    await message.confirm('将为主索引历史文档回填 formatGroup 字段，是否继续？')
  } catch {
    return
  }
  backfillLoading.value = true
  try {
    const result = await ControlTaskApi.backfillFormatGroup({ overwrite: false })
    message.success(`回填完成：更新 ${result.updated || 0}，跳过 ${result.skipped || 0}，失败 ${result.failed || 0}`)
    if (currentTask.value?.id) {
      await loadAnalysis(currentTask.value.id)
    }
  } finally {
    backfillLoading.value = false
  }
}

const isDatabaseStorage = (storageId: number) => {
  const storage = storageList.value.find((item) => item.id === storageId)
  return storage?.mediumType === '1'
}

const formatGroupLabel = (value?: string) => {
  return formatOptions.find((item) => item.value === value)?.label || value || '-'
}

onMounted(async () => {
  storageList.value = await getStorageList()
  await getList()
})
</script>

<style scoped>
.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.analysis-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.analysis-subtitle {
  margin-top: 4px;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
}

.stat-card.success {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
}

.stat-card.warning {
  background: linear-gradient(135deg, #fffbeb, #fde68a);
}

.stat-card.danger {
  background: linear-gradient(135deg, #fef2f2, #fecaca);
}

.stat-label {
  color: #6b7280;
  font-size: 13px;
}

.stat-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.format-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
}

.section-tip {
  color: #6b7280;
  font-size: 13px;
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.format-card {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-card.active,
.format-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.format-name {
  color: #374151;
}

.format-count {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
}

@media (max-width: 960px) {
  .stats-grid,
  .format-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
