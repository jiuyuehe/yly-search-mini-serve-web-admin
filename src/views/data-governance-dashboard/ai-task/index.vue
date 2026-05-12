<template>
  <div class="dashboard-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>AI 任务看板</span></div>
          <div class="page-title">AI 任务运行态势</div>
          <div class="page-subtitle">聚合任务总量、状态分布、任务类型分布、执行趋势和最近日志。</div>
        </div>
        <el-button type="primary" @click="loadData"><Icon icon="ep:refresh" class="mr-5px" />刷新看板</el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid" v-loading="loading">
      <div v-for="item in kpiCards" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">{{ item.delta }}</div>
      </div>
    </div>

    <div class="panel-grid">
      <ContentWrap>
        <template #header>任务类型分布</template>
        <div class="distribution">
          <div class="donut type-donut">
            <strong>{{ formatNumber(totalTasks) }}<span>任务总量</span></strong>
          </div>
          <div class="legend-list">
            <div v-for="item in taskTypeRows" :key="item.name" class="legend-item">
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.name }}</span>
              <b>{{ item.percent }}%</b>
              <em>{{ formatNumber(item.count) }}</em>
            </div>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap>
        <template #header>近 7 天成功/失败趋势</template>
        <div class="mini-chart">
          <div v-for="item in trendRows" :key="item.date" class="chart-col">
            <div class="bar green" :style="{ height: `${barHeight(item.success || item.total || 0)}%` }"></div>
            <div class="bar orange" :style="{ height: `${barHeight(item.failed || 0)}%` }"></div>
            <span>{{ item.date }}</span>
          </div>
        </div>
        <div class="legend">
          <span><i class="green-dot"></i>成功/执行</span>
          <span><i class="orange-dot"></i>失败</span>
        </div>
      </ContentWrap>
    </div>

    <div class="panel-grid">
      <ContentWrap>
        <template #header>AI 任务运行日志</template>
        <el-form ref="logQueryFormRef" :inline="true" :model="logQuery" class="log-filter" label-width="82px">
          <el-form-item label="调度任务ID" prop="scheduleTaskId">
            <el-input v-model="logQuery.scheduleTaskId" class="!w-180px" clearable placeholder="scheduleTaskId" />
          </el-form-item>
          <el-form-item label="任务类型" prop="taskType">
            <el-input v-model="logQuery.taskType" class="!w-160px" clearable placeholder="summary / ner" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="logQuery.status" class="!w-140px" clearable placeholder="全部">
              <el-option label="成功" value="SUCCESS" />
              <el-option label="失败" value="FAILED" />
              <el-option label="运行中" value="RUNNING" />
              <el-option label="等待中" value="PENDING" />
            </el-select>
          </el-form-item>
          <el-form-item label="触发来源" prop="triggerSource">
            <el-select v-model="logQuery.triggerSource" class="!w-140px" clearable placeholder="全部">
              <el-option label="手动" value="manual" />
              <el-option label="定时" value="schedule" />
            </el-select>
          </el-form-item>
          <el-form-item label="文件名称" prop="fileName">
            <el-input v-model="logQuery.fileName" class="!w-180px" clearable placeholder="支持模糊查询" />
          </el-form-item>
          <el-form-item label="文档ID" prop="esId">
            <el-input v-model="logQuery.esId" class="!w-200px" clearable placeholder="esId" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleLogQuery">
              <Icon icon="ep:search" class="mr-5px" />搜索
            </el-button>
            <el-button @click="resetLogQuery">
              <Icon icon="ep:refresh" class="mr-5px" />重置
            </el-button>
          </el-form-item>
        </el-form>
        <el-table :data="logList" stripe height="360" v-loading="logLoading">
          <el-table-column label="任务ID" prop="taskId" min-width="160" show-overflow-tooltip />
          <el-table-column label="调度任务ID" prop="scheduleTaskId" width="110" />
          <el-table-column label="类型" prop="taskType" width="140" />
          <el-table-column label="状态" prop="status" width="120">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="耗时(ms)" prop="durationMs" width="110" />
          <el-table-column label="文件" prop="fileName" min-width="170" show-overflow-tooltip />
          <el-table-column label="错误信息" prop="errorMessage" min-width="180" show-overflow-tooltip />
        </el-table>
        <Pagination
          :total="logTotal"
          v-model:page="logQuery.pageNo"
          v-model:limit="logQuery.pageSize"
          @pagination="loadLogs"
        />
      </ContentWrap>

      <ContentWrap>
        <template #header>治理任务队列</template>
        <el-table :data="governanceTasks" stripe height="360">
          <el-table-column label="任务名称" prop="name" min-width="160" show-overflow-tooltip />
          <el-table-column label="规则" prop="ruleId" width="90" />
          <el-table-column label="状态" prop="status" width="120">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="ESID" prop="esId" min-width="170" show-overflow-tooltip />
        </el-table>
      </ContentWrap>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'
import { AiTaskLogApi, AiTaskLogPageReqVO, AiTaskLogVO } from '@/api/rag/aitasklog'

defineOptions({ name: 'DataGovernanceDashboardAiTask' })

const route = useRoute()
const loading = ref(false)
const logLoading = ref(false)
const data = ref<Record<string, any>>({})
const logList = ref<AiTaskLogVO[]>([])
const logTotal = ref(0)
const logQueryFormRef = ref()
const colors = ['#2f7bff', '#39b76d', '#ffa53a', '#727cf5', '#55c7d9']

const statusStats = computed<Record<string, number>>(() => data.value.statusStats || {})
const totalTasks = computed(() => Number(data.value.total || 0))
const governanceTasks = computed(() => data.value.governanceTasks || [])
const successCount = computed(() => sumByKeys(statusStats.value, ['SUCCESS', 'FINISHED', 'DONE', 'COMPLETED']))
const failedCount = computed(() => sumByKeys(statusStats.value, ['FAILED', 'ERROR', 'FAIL']))
const runningCount = computed(() => sumByKeys(statusStats.value, ['RUNNING', 'PROCESSING', 'PENDING']))
const successRate = computed(() => totalTasks.value ? ((successCount.value * 100) / totalTasks.value).toFixed(1) : '0.0')

const kpiCards = computed(() => [
  { label: 'AI 日志总量', value: formatNumber(totalTasks.value), delta: '日志索引' },
  { label: '成功任务', value: formatNumber(successCount.value), delta: `${successRate.value}%` },
  { label: '失败任务', value: formatNumber(failedCount.value), delta: failedCount.value ? '需处理' : '无异常' },
  { label: '运行中', value: formatNumber(runningCount.value), delta: '实时状态' },
  { label: '平均耗时', value: `${Math.round(Number(data.value.avgDurationMs || 0))} ms`, delta: '模型调用' },
  { label: '治理任务', value: formatNumber(data.value.taskCount || governanceTasks.value.length), delta: '任务队列' }
])

const logQuery = reactive<AiTaskLogPageReqVO & { triggerSource?: string }>({
  pageNo: 1,
  pageSize: 10,
  taskType: undefined,
  status: undefined,
  fileName: undefined,
  esId: undefined,
  scheduleTaskId: undefined,
  triggerSource: undefined
})

const taskTypeRows = computed(() => {
  const stats = data.value.taskTypeStats || {}
  const entries = Object.keys(stats).length ? Object.entries(stats) : [['summary', 0], ['ner', 0], ['form_extract', 0]]
  const total = entries.reduce((sum, [, count]) => sum + Number(count || 0), 0) || 1
  return entries.map(([name, count], index) => ({
    name,
    count: Number(count || 0),
    color: colors[index % colors.length],
    percent: ((Number(count || 0) * 100) / total).toFixed(1)
  }))
})

const trendRows = computed(() => {
  const rows = data.value.recentTrend || []
  return rows.length ? rows : [
    { date: 'D-7', total: 30, failed: 2 },
    { date: 'D-6', total: 42, failed: 3 },
    { date: 'D-5', total: 48, failed: 4 },
    { date: 'D-4', total: 55, failed: 2 },
    { date: 'D-3', total: 62, failed: 5 },
    { date: 'D-2', total: 70, failed: 4 },
    { date: 'D-1', total: 66, failed: 2 }
  ]
})

const sumByKeys = (stats: Record<string, number>, keys: string[]) =>
  keys.reduce((sum, key) => sum + Number(stats[key] || stats[key.toLowerCase()] || 0), 0)
const formatNumber = (value: number | string) => Number(value || 0).toLocaleString()
const barHeight = (value: number) => Math.max(8, Math.min(100, Number(value || 0)))
const statusType = (status?: string) => {
  if (['SUCCESS', 'FINISHED', 'DONE', 'COMPLETED'].includes(status || '')) return 'success'
  if (['FAILED', 'ERROR', 'FAIL'].includes(status || '')) return 'danger'
  if (['RUNNING', 'PROCESSING', 'PENDING'].includes(status || '')) return 'warning'
  return 'info'
}

const loadData = async () => {
  loading.value = true
  try {
    data.value = await GovernanceApi.dashboardAiTask()
  } finally {
    loading.value = false
  }
}

const applyRouteFilter = () => {
  logQuery.scheduleTaskId = route.query.scheduleTaskId ? String(route.query.scheduleTaskId) : undefined
  logQuery.triggerSource = route.query.triggerSource ? String(route.query.triggerSource) : undefined
  logQuery.taskType = route.query.taskType ? String(route.query.taskType) : undefined
  logQuery.esId = route.query.esId ? String(route.query.esId) : undefined
  logQuery.pageNo = 1
}

const loadLogs = async () => {
  logLoading.value = true
  try {
    const data = await AiTaskLogApi.getPage(logQuery)
    logList.value = data.list || []
    logTotal.value = Number(data.total || 0)
  } finally {
    logLoading.value = false
  }
}

const handleLogQuery = () => {
  logQuery.pageNo = 1
  loadLogs()
}

const resetLogQuery = async () => {
  logQueryFormRef.value?.resetFields()
  logQuery.pageNo = 1
  await loadLogs()
}

watch(
  () => route.query,
  async () => {
    applyRouteFilter()
    await loadLogs()
  }
)

onMounted(async () => {
  applyRouteFilter()
  await Promise.all([loadData(), loadLogs()])
})
</script>

<style scoped>
.dashboard-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 800; color: #101828; }
.page-subtitle { margin-top: 6px; color: #667085; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 10px; font-size: 24px; font-weight: 800; color: #101828; }
.kpi-delta { margin-top: 8px; color: #12a666; }
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.log-filter { margin-bottom: 12px; }
.distribution { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: center; min-height: 280px; }
.donut { width: 190px; height: 190px; border-radius: 50%; display: grid; place-items: center; }
.type-donut { background: conic-gradient(#2f7bff 0 34%, #39b76d 34% 59%, #ffa53a 59% 78%, #727cf5 78% 91%, #55c7d9 91% 100%); }
.donut strong { width: 124px; height: 124px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; font-size: 20px; }
.donut span { display: block; margin-top: 4px; color: #667085; font-size: 12px; font-weight: 400; }
.legend-list { display: flex; flex-direction: column; gap: 12px; }
.legend-item { display: grid; grid-template-columns: 12px 1fr 70px 90px; align-items: center; gap: 8px; color: #475467; }
.legend-item i { width: 10px; height: 10px; border-radius: 2px; }
.legend-item b { color: #101828; }
.legend-item em { color: #667085; font-style: normal; text-align: right; }
.mini-chart { height: 250px; display: flex; align-items: flex-end; justify-content: space-around; gap: 12px; padding-top: 20px; }
.chart-col { height: 220px; flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 5px; position: relative; }
.chart-col span { position: absolute; bottom: -22px; color: #667085; font-size: 12px; }
.bar { width: 18px; min-height: 12px; border-radius: 4px 4px 0 0; }
.bar.green, .green-dot { background: #39b76d; }
.bar.orange, .orange-dot { background: #ffa53a; }
.legend { margin-top: 30px; display: flex; gap: 18px; color: #667085; }
.legend i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .panel-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid, .distribution { grid-template-columns: 1fr; } }
</style>
