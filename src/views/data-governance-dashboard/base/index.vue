<template>
  <div class="dashboard-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>基础数据看板</span></div>
          <div class="page-title">基础数据资产总览</div>
          <div class="page-subtitle">总量、索引分布、增量趋势和处理日志统一呈现。</div>
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
        <template #header>索引数据分布</template>
        <div class="distribution">
          <div class="donut">
            <strong>{{ formatNumber(totalDistribution) }}<span>索引总量</span></strong>
          </div>
          <div class="legend-list">
            <div v-for="item in distributionRows" :key="item.name" class="legend-item">
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.name }}</span>
              <b>{{ item.percent }}%</b>
              <em>{{ formatNumber(item.count) }}</em>
            </div>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap>
        <template #header>近 7 天处理增量</template>
        <div class="mini-chart">
          <div v-for="item in trendRows" :key="item.date" class="chart-col">
            <div class="bar blue" :style="{ height: `${item.docs}%` }"></div>
            <div class="bar green" :style="{ height: `${item.indexes}%` }"></div>
            <span>{{ item.date }}</span>
          </div>
        </div>
        <div class="legend">
          <span><i class="blue-dot"></i>文档入库</span>
          <span><i class="green-dot"></i>索引写入</span>
        </div>
      </ContentWrap>
    </div>

    <ContentWrap>
      <template #header>处理日志历史</template>
      <el-table :data="recentLogs" stripe>
        <el-table-column label="任务ID" prop="taskId" min-width="180" show-overflow-tooltip />
        <el-table-column label="文档ID" prop="esId" min-width="180" show-overflow-tooltip />
        <el-table-column label="任务类型" prop="taskType" width="150" />
        <el-table-column label="状态" prop="status" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updatedAt" min-width="170" />
      </el-table>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'DataGovernanceDashboardBase' })

const loading = ref(false)
const data = ref<Record<string, any>>({})

const demoTrend = [
  { date: '05-05', docs: 38, indexes: 42 },
  { date: '05-06', docs: 52, indexes: 48 },
  { date: '05-07', docs: 66, indexes: 58 },
  { date: '05-08', docs: 74, indexes: 68 },
  { date: '05-09', docs: 62, indexes: 70 },
  { date: '05-10', docs: 88, indexes: 82 },
  { date: '05-11', docs: 76, indexes: 86 }
]

const fallbackDistribution = [
  { name: '文档索引', count: 1268754 },
  { name: '增强索引', count: 438219 },
  { name: '向量索引', count: 26843912 },
  { name: 'RAG 向量', count: 536880 }
]
const colors = ['#2f7bff', '#39b76d', '#ffa53a', '#727cf5']

const totalDistribution = computed(() => distributionRows.value.reduce((sum, item) => sum + Number(item.count || 0), 0))
const distributionRows = computed(() => {
  const rows = (data.value.typeDistribution || []).some((item: any) => Number(item.count || 0) > 0)
    ? data.value.typeDistribution
    : fallbackDistribution
  const total = rows.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0) || 1
  return rows.map((item: any, index: number) => ({
    ...item,
    color: colors[index % colors.length],
    percent: ((Number(item.count || 0) * 100) / total).toFixed(1)
  }))
})

const kpiCards = computed(() => [
  { label: '数据总量', value: formatNumber(metric('dataCount', 2911665)), delta: '总资产' },
  { label: '文档总量', value: formatNumber(metric('documentCount', 1268754)), delta: '主索引' },
  { label: '索引数据量', value: formatNumber(metric('indexCount', 27819011)), delta: '增强 + 向量' },
  { label: '治理任务', value: formatNumber(metric('taskCount', 0)), delta: '任务库' },
  { label: '治理规则', value: formatNumber(metric('ruleCount', 0)), delta: '规则库' },
  { label: 'Tool 调用', value: formatNumber(metric('toolLogCount', 0)), delta: data.value.health || 'ready' }
])

const trendRows = computed(() => data.value.trend || demoTrend)
const recentLogs = computed(() => data.value.recentLogs || [])

const metric = (key: string, fallback: number) => Number(data.value[key] || 0) || fallback
const formatNumber = (value: number | string) => Number(value || 0).toLocaleString()
const statusType = (status?: string) => {
  if (['SUCCESS', 'FINISHED', 'DONE'].includes(status || '')) return 'success'
  if (['FAILED', 'ERROR'].includes(status || '')) return 'danger'
  if (['RUNNING', 'PROCESSING'].includes(status || '')) return 'warning'
  return 'info'
}

const loadData = async () => {
  loading.value = true
  try {
    data.value = await GovernanceApi.dashboardBase()
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
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
.distribution { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: center; min-height: 280px; }
.donut { width: 190px; height: 190px; border-radius: 50%; background: conic-gradient(#2f7bff 0 42%, #39b76d 42% 58%, #ffa53a 58% 92%, #727cf5 92% 100%); display: grid; place-items: center; }
.donut strong { width: 124px; height: 124px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; font-size: 20px; }
.donut span { display: block; margin-top: 4px; color: #667085; font-size: 12px; font-weight: 400; }
.legend-list { display: flex; flex-direction: column; gap: 12px; }
.legend-item { display: grid; grid-template-columns: 12px 1fr 70px 100px; align-items: center; gap: 8px; color: #475467; }
.legend-item i { width: 10px; height: 10px; border-radius: 2px; }
.legend-item b { color: #101828; }
.legend-item em { color: #667085; font-style: normal; text-align: right; }
.mini-chart { height: 250px; display: flex; align-items: flex-end; justify-content: space-around; gap: 12px; padding-top: 20px; }
.chart-col { height: 220px; flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 5px; position: relative; }
.chart-col span { position: absolute; bottom: -22px; color: #667085; font-size: 12px; }
.bar { width: 18px; min-height: 12px; border-radius: 4px 4px 0 0; }
.bar.blue, .blue-dot { background: #2f7bff; }
.bar.green, .green-dot { background: #39b76d; }
.legend { margin-top: 30px; display: flex; gap: 18px; color: #667085; }
.legend i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .panel-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid, .distribution { grid-template-columns: 1fr; } }
</style>
