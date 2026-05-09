<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / 数据治理看板 / <span>AI 任务看板</span></div>
          <div class="governance-page-title">AI 任务运行态势</div>
          <div class="governance-page-subtitle">围绕治理任务执行、模型调用和失败风险形成统一监控。</div>
        </div>
        <el-button type="primary" @click="loadData">
          <Icon icon="ep:refresh" class="mr-5px" />
          刷新看板
        </el-button>
      </div>
    </ContentWrap>

    <div class="governance-kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="governance-kpi-card">
        <div class="governance-kpi-label">{{ item.label }}</div>
        <div class="governance-kpi-value">{{ item.value }}</div>
        <div class="governance-kpi-delta">较昨日 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <div class="governance-panel-grid">
      <ContentWrap class="governance-panel">
        <template #header>模型调用分布</template>
        <div class="governance-donut-row">
          <div class="governance-donut model-donut">
            <strong>{{ totalModelCalls }}<span>模型调用</span></strong>
          </div>
          <div class="governance-legend-list">
            <div v-for="item in modelDistribution" :key="item.name" class="governance-legend-item">
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.name }}</span>
              <b>{{ item.percent }}</b>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap class="governance-panel">
        <template #header>近 7 天任务成功/失败趋势</template>
        <div class="governance-mini-chart">
          <div v-for="item in trend" :key="item.date" class="governance-chart-col">
            <div class="governance-bar green" :style="{ height: item.success + '%' }"></div>
            <div class="governance-bar orange" :style="{ height: item.failed + '%' }"></div>
            <span>{{ item.date }}</span>
          </div>
        </div>
        <div class="governance-legend">
          <span><i class="legend-green"></i>成功任务</span>
          <span><i class="legend-orange"></i>失败任务</span>
        </div>
      </ContentWrap>
    </div>

    <div class="governance-panel-grid">
      <ContentWrap class="governance-table-panel">
        <template #header>最近任务列表</template>
        <el-table :data="tasks" stripe class="governance-dense-table">
          <el-table-column label="任务名称" prop="name" min-width="180" show-overflow-tooltip />
          <el-table-column label="规则" prop="ruleId" width="90" />
          <el-table-column label="状态" prop="status" width="120">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="ESID" prop="esId" min-width="220" show-overflow-tooltip />
        </el-table>
      </ContentWrap>

      <ContentWrap class="governance-table-panel">
        <template #header>任务指标明细</template>
        <el-table :data="metricRows" stripe class="governance-dense-table">
          <el-table-column label="指标" prop="name" min-width="180" />
          <el-table-column label="值" prop="value" min-width="220" />
        </el-table>
      </ContentWrap>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceAiTaskDashboard' })
const data = ref<Record<string, any>>({})
const tasks = ref<any[]>([])

const getMetric = (keys: string[], fallback: number | string) => {
  const key = keys.find((item) => data.value[item] !== undefined && data.value[item] !== null)
  return key ? data.value[key] : fallback
}

const formatNumber = (value: number | string) => Number(value || 0).toLocaleString()

const kpiCards = computed(() => [
  { label: '任务总量', value: formatNumber(getMetric(['taskCount', 'totalTaskCount', 'total'], tasks.value.length)), delta: '↑ 2.1%' },
  { label: '成功率', value: `${getMetric(['successRate'], 96.8)}%`, delta: '↑ 0.7%' },
  { label: '失败率', value: `${getMetric(['failureRate', 'failedRate'], 3.2)}%`, delta: '↓ 0.4%' },
  { label: '平均耗时', value: `${getMetric(['avgDuration', 'averageDuration'], 8.6)}s`, delta: '↓ 1.2s' },
  { label: '今日执行', value: formatNumber(getMetric(['todayCount', 'todayTaskCount'], 128)), delta: '↑ 12' },
  { label: '待处理', value: formatNumber(getMetric(['pendingCount'], 14)), delta: '待治理' }
])

const totalModelCalls = computed(() => formatNumber(getMetric(['modelCallCount', 'llmCallCount'], 4380)))

const modelDistribution = computed(() => [
  { name: '摘要/总结模型', percent: '34.8%', count: '1,524', color: '#2f7bff' },
  { name: '分类分级模型', percent: '24.6%', count: '1,078', color: '#39b76d' },
  { name: 'NER 图谱模型', percent: '18.2%', count: '797', color: '#ffa53a' },
  { name: '表单抽取模型', percent: '14.5%', count: '635', color: '#727cf5' },
  { name: '翻译/OCR 模型', percent: '7.9%', count: '346', color: '#55c7d9' }
])

const trend = [
  { date: '05-02', success: 46, failed: 8 },
  { date: '05-03', success: 58, failed: 12 },
  { date: '05-04', success: 62, failed: 9 },
  { date: '05-05', success: 74, failed: 15 },
  { date: '05-06', success: 82, failed: 13 },
  { date: '05-07', success: 78, failed: 10 },
  { date: '05-08', success: 88, failed: 7 }
]

const metricRows = computed(() =>
  Object.entries(data.value || {}).map(([name, value]) => ({
    name,
    value
  }))
)

const statusType = (status?: string) => {
  if (!status) return 'info'
  if (['SUCCESS', 'FINISHED', 'DONE'].includes(status)) return 'success'
  if (['FAILED', 'ERROR'].includes(status)) return 'danger'
  if (['RUNNING', 'PROCESSING'].includes(status)) return 'warning'
  return 'info'
}

const loadData = async () => {
  data.value = await GovernanceApi.dashboardAiTask()
  tasks.value = (await GovernanceApi.listTasks()).slice(0, 8)
}

onMounted(loadData)
</script>

<style scoped>
.model-donut {
  background: conic-gradient(#2f7bff 0 36%, #39b76d 36% 61%, #ffa53a 61% 79%, #727cf5 79% 92%, #55c7d9 92% 100%);
}

.legend-green {
  background: #39b76d;
}

.legend-orange {
  background: #ffa53a;
}
</style>
