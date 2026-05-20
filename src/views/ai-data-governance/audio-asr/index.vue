<template>
  <div class="audio-index-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="eyebrow">Audio & Video AI Index</div>
          <div class="title">音视频 AI 索引管理</div>
          <div class="subtitle">统一查看音频、视频基础索引量、转写覆盖率、分析日志和转写详情。</div>
        </div>
        <div class="head-actions">
          <el-button type="primary" @click="taskVisible = true">创建音视频分析任务</el-button>
          <el-button plain @click="goTool">单文件转写工具</el-button>
          <el-button plain @click="goTaskLog">查看任务日志</el-button>
        </div>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="kpi-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <ContentWrap>
          <template #header>ASR 覆盖率</template>
          <div class="progress-stack">
            <div>
              <span>已转写 {{ stats.transcribedCount || 0 }} / {{ stats.total || 0 }}</span>
              <el-progress :percentage="Math.round((stats.coverageRate || 0) * 100)" />
            </div>
            <div>
              <span>失败 {{ stats.failedCount || 0 }} / 待处理 {{ stats.pendingCount || 0 }}</span>
              <el-progress :percentage="pendingPercent" status="warning" />
            </div>
          </div>
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="10">
        <ContentWrap>
          <template #header>来源与格式分布</template>
          <div class="chips">
            <el-tag v-for="item in sourceDistribution" :key="item.name" effect="plain">{{ item.name }}：{{ item.count }}</el-tag>
          </div>
          <el-divider />
          <div class="chips">
            <el-tag v-for="item in extDistribution" :key="item.name" type="success" effect="plain">{{ item.name }}：{{ item.count }}</el-tag>
          </div>
        </ContentWrap>
      </el-col>
    </el-row>

    <ContentWrap>
      <el-form :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
        <el-form-item label="文件名">
          <el-input v-model="queryParams.keyword" class="!w-240px" clearable placeholder="输入音视频文件名" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="queryParams.formatGroup" class="!w-140px" clearable placeholder="全部">
            <el-option label="音频" value="audio" />
            <el-option label="视频" value="video" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <ContentWrap>
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="文件名" prop="fileName" min-width="240" show-overflow-tooltip />
        <el-table-column label="类型" prop="formatGroup" width="90" />
        <el-table-column label="格式" prop="fileExt" width="90" />
        <el-table-column label="大小" width="110">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column label="来源" prop="sourceType" width="110" />
        <el-table-column label="ASR状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.asrStatus === 'FINISHED' ? 'success' : row.asrStatus === 'FAILED' ? 'danger' : 'info'">
              {{ statusLabel(row.asrStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="文本长度" prop="textLength" width="110" />
        <el-table-column label="摘要" width="90">
          <template #default="{ row }">
            <el-tag :type="row.summaryStatus === 'success' ? 'success' : 'info'">{{ row.summaryStatus === 'success' ? '已生成' : '待生成' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近分析时间" prop="updatedAt" width="180" />
        <el-table-column label="错误原因" prop="error" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看转写</el-button>
            <el-button link type="success" @click="goTool(row)">重新转写</el-button>
            <el-button link @click="openLogs(row)">查看日志</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </ContentWrap>

    <ContentWrap>
      <template #header>音视频分析日志</template>
      <el-form :inline="true" :model="logQuery" class="-mb-15px" label-width="72px">
        <el-form-item label="文件名">
          <el-input v-model="logQuery.fileName" class="!w-240px" clearable placeholder="只按文件名过滤" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadLogs">搜索</el-button>
          <el-button @click="resetLogs">重置</el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="logLoading" :data="logList" stripe class="mt-16px">
        <el-table-column label="文件名" prop="fileName" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" prop="status" width="110" />
        <el-table-column label="耗时" width="110">
          <template #default="{ row }">{{ row.durationMs ? `${row.durationMs}ms` : '-' }}</template>
        </el-table-column>
        <el-table-column label="错误原因" prop="errorMessage" min-width="240" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" width="180" />
      </el-table>
      <Pagination :total="logTotal" v-model:page="logQuery.pageNo" v-model:limit="logQuery.pageSize" @pagination="loadLogs" />
    </ContentWrap>

    <el-drawer v-model="detailVisible" title="转写详情" size="720px">
      <el-tabs v-model="detailTab">
        <el-tab-pane label="纯文本" name="plain">
          <pre class="detail-text">{{ detailResult.plainText || '暂无转写文本' }}</pre>
        </el-tab-pane>
        <el-tab-pane label="摘要" name="summary">
          <pre class="detail-text">{{ detailResult.summaryText || detailResult.organizedText || '暂无摘要' }}</pre>
        </el-tab-pane>
        <el-tab-pane label="分片明细" name="segments">
          <el-table :data="detailResult.segments || []" stripe>
            <el-table-column label="#" prop="index" width="70" />
            <el-table-column label="时间" width="180">
              <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
            </el-table-column>
            <el-table-column label="文本" prop="text" min-width="320" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="原始结果" name="raw">
          <pre class="detail-text">{{ JSON.stringify(detail, null, 2) }}</pre>
        </el-tab-pane>
      </el-tabs>
      <el-button type="primary" plain class="mt-12px" @click="copyText">复制文本</el-button>
    </el-drawer>

    <el-dialog v-model="taskVisible" title="创建音视频分析任务" width="720px">
      <el-form :model="taskForm" label-width="120px">
        <el-form-item label="任务名称">
          <el-input v-model="taskForm.taskName" />
        </el-form-item>
        <el-form-item label="ASR模型">
          <el-select v-model="taskForm.modelId" class="!w-full" clearable filterable placeholder="请选择语音模型">
            <el-option v-for="item in voiceModels" :key="item.id" :label="`${item.name}（${item.model}）`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分析范围">
          <el-checkbox-group v-model="taskForm.formatGroups">
            <el-checkbox label="audio">音频</el-checkbox>
            <el-checkbox label="video">视频</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="覆盖已有结果">
          <el-switch v-model="taskForm.embeddingOverwrite" />
        </el-form-item>
        <el-form-item label="Cron表达式">
          <el-input v-model="taskForm.cronExpression" />
        </el-form-item>
        <el-alert show-icon :closable="false" type="info" title="任务会按基础索引中的音视频文件触发 ASR，转写 plainText 会写回主搜索索引。" />
      </el-form>
      <template #footer>
        <el-button @click="taskVisible = false">取消</el-button>
        <el-button type="primary" :loading="taskLoading" @click="createTask">创建任务</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { AudioVideoIndexApi } from '@/api/rag/audio-video-index'
import { AiScheduleTaskApi } from '@/api/rag/ai-schedule'
import { ModelApi } from '@/api/ai/model/model'

defineOptions({ name: 'AiDataGovernanceAudioAsr' })

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const logLoading = ref(false)
const taskLoading = ref(false)
const taskVisible = ref(false)
const detailVisible = ref(false)
const stats = ref<any>({})
const distribution = ref<any>({})
const list = ref<any[]>([])
const total = ref(0)
const logList = ref<any[]>([])
const logTotal = ref(0)
const detail = ref<any>({})
const detailTab = ref('plain')
const voiceModels = ref<any[]>([])

const queryParams = reactive({ pageNo: 1, pageSize: 10, keyword: '', formatGroup: '' })
const logQuery = reactive({ pageNo: 1, pageSize: 10, fileName: '', taskType: 'audio_asr' })
const taskForm = reactive<any>({
  taskName: '音视频 AI 分析任务',
  aiTaskType: 'audio_asr',
  modelId: undefined,
  formatGroups: ['audio', 'video'],
  embeddingOverwrite: true,
  cronExpression: '0 0/30 * * * ?'
})

const kpiCards = computed(() => [
  { label: '音视频总数', value: stats.value.total || 0, hint: '基础索引' },
  { label: '音频数量', value: stats.value.audioCount || 0, hint: 'formatGroup=audio' },
  { label: '视频数量', value: stats.value.videoCount || 0, hint: 'formatGroup=video' },
  { label: '已转写', value: stats.value.transcribedCount || 0, hint: 'ASR完成' },
  { label: '转写失败', value: stats.value.failedCount || 0, hint: '需要排查' },
  { label: '覆盖率', value: `${Math.round((stats.value.coverageRate || 0) * 100)}%`, hint: '已转写/总数' },
  { label: '今日处理', value: stats.value.todayProcessed || 0, hint: '今日更新' },
  { label: '平均耗时', value: stats.value.avgDurationMs || 0, hint: '毫秒' }
])

const pendingPercent = computed(() => {
  const totalValue = Number(stats.value.total || 0)
  if (!totalValue) return 0
  return Math.round(((stats.value.pendingCount || 0) / totalValue) * 100)
})
const sourceDistribution = computed(() => toDistribution(distribution.value.bySource))
const extDistribution = computed(() => toDistribution(distribution.value.byExt))
const detailResult = computed(() => detail.value?.result || {})

const loadDashboard = async () => {
  const [statsData, distributionData, models] = await Promise.all([
    AudioVideoIndexApi.getStats(),
    AudioVideoIndexApi.getDistribution(),
    ModelApi.getModelSimpleList(3)
  ])
  stats.value = statsData || {}
  distribution.value = distributionData || {}
  voiceModels.value = models || []
}

const getList = async () => {
  loading.value = true
  try {
    const data = await AudioVideoIndexApi.getPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const loadLogs = async () => {
  logLoading.value = true
  try {
    const data = await AudioVideoIndexApi.getLogs(logQuery)
    logList.value = data.list || []
    logTotal.value = data.total || 0
  } finally {
    logLoading.value = false
  }
}

const createTask = async () => {
  taskLoading.value = true
  try {
    await AiScheduleTaskApi.create(taskForm)
    message.success('音视频分析任务已创建')
    taskVisible.value = false
    await loadLogs()
  } finally {
    taskLoading.value = false
  }
}

const handleQuery = () => { queryParams.pageNo = 1; getList() }
const resetQuery = () => { queryParams.keyword = ''; queryParams.formatGroup = ''; handleQuery() }
const resetLogs = () => { logQuery.fileName = ''; logQuery.pageNo = 1; loadLogs() }
const openLogs = (row: any) => { logQuery.fileName = row.fileName || ''; logQuery.pageNo = 1; loadLogs() }
const goTool = (row?: any) => router.push({ path: '/rag/audio-asr', query: row?.esId ? { esId: row.esId } : {} })
const goTaskLog = () => router.push({ path: '/data-governance-dashboard/ai-task', query: { taskType: 'audio_asr' } })

const openDetail = async (row: any) => {
  detail.value = await AudioVideoIndexApi.getDetail({ esId: row.esId })
  detailVisible.value = true
}

const copyText = async () => {
  await navigator.clipboard?.writeText(detailResult.value.plainText || '')
  message.success('转写文本已复制')
}

const toDistribution = (obj?: Record<string, number>) => Object.entries(obj || {}).map(([name, count]) => ({ name, count })).slice(0, 12)
const statusLabel = (status?: string) => ({ FINISHED: '已完成', FAILED: '失败', WAITING: '待处理', TRANSCRIBING: '转写中' }[status || 'WAITING'] || status)
const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(async () => {
  await Promise.all([loadDashboard(), getList(), loadLogs()])
})
</script>

<style scoped>
.audio-index-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.eyebrow { color: #1f6fff; font-weight: 700; }
.title { margin-top: 8px; font-size: 24px; font-weight: 800; color: #101828; }
.subtitle { margin-top: 6px; color: #667085; }
.head-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.kpi-card { padding: 16px; background: #fff; border: 1px solid #e6ebf2; border-radius: 8px; }
.kpi-card span { color: #667085; }
.kpi-card strong { display: block; margin-top: 8px; font-size: 24px; color: #101828; }
.kpi-card small { display: block; margin-top: 4px; color: #98a2b3; }
.progress-stack { display: grid; gap: 18px; }
.progress-stack span { display: block; margin-bottom: 8px; color: #475467; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.detail-text { white-space: pre-wrap; word-break: break-word; min-height: 220px; padding: 12px; background: #f8fbff; border: 1px solid #e6ebf2; border-radius: 6px; }
@media (max-width: 1000px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .page-head { align-items: flex-start; flex-direction: column; }
}
</style>
