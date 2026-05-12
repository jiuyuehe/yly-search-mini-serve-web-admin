<template>
  <div class="dashboard-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>定时治理看板</span></div>
          <div class="page-title">定时治理任务监控</div>
          <div class="page-subtitle">围绕治理规则、定时任务趋势和失败任务形成运行态势。</div>
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
        <template #header>治理规则运行状态</template>
        <div class="rule-strip">
          <div class="rule-cell success">
            <span>启用规则</span>
            <b>{{ formatNumber(data.enabledRuleCount || 0) }}</b>
          </div>
          <div class="rule-cell muted">
            <span>暂停规则</span>
            <b>{{ formatNumber(data.pausedRuleCount || 0) }}</b>
          </div>
          <div class="rule-cell warning">
            <span>运行中任务</span>
            <b>{{ formatNumber(data.runningTaskCount || 0) }}</b>
          </div>
          <div class="rule-cell danger">
            <span>失败任务</span>
            <b>{{ formatNumber(data.failedTaskCount || 0) }}</b>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap>
        <template #header>近 7 天调度趋势</template>
        <div class="mini-chart">
          <div v-for="item in trendRows" :key="item.date" class="chart-col">
            <div class="bar blue" :style="{ height: `${barHeight(item.executed)}%` }"></div>
            <div class="bar orange" :style="{ height: `${barHeight(item.failed)}%` }"></div>
            <span>{{ item.date }}</span>
          </div>
        </div>
        <div class="legend">
          <span><i class="blue-dot"></i>执行</span>
          <span><i class="orange-dot"></i>失败</span>
        </div>
      </ContentWrap>
    </div>

    <ContentWrap>
      <template #header>最近治理任务</template>
      <el-table :data="latestTasks" stripe>
        <el-table-column label="ID" prop="id" width="90" />
        <el-table-column label="任务名称" prop="name" min-width="180" show-overflow-tooltip />
        <el-table-column label="规则ID" prop="ruleId" width="100" />
        <el-table-column label="状态" prop="status" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="ESID" prop="esId" min-width="220" show-overflow-tooltip />
        <el-table-column label="更新时间" prop="updateTime" min-width="170" />
      </el-table>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'DataGovernanceDashboardSchedule' })

const loading = ref(false)
const data = ref<Record<string, any>>({})

const latestTasks = computed(() => data.value.latestTasks || [])
const trendRows = computed(() => data.value.trend || [])

const kpiCards = computed(() => [
  { label: '启用规则', value: formatNumber(data.value.enabledRuleCount || 0), delta: '可调度' },
  { label: '暂停规则', value: formatNumber(data.value.pausedRuleCount || 0), delta: '待处理' },
  { label: '治理任务', value: formatNumber(data.value.governanceTaskCount || 0), delta: '任务总数' },
  { label: '成功任务', value: formatNumber(data.value.successTaskCount || 0), delta: '已完成' },
  { label: '运行中', value: formatNumber(data.value.runningTaskCount || 0), delta: '执行中' },
  { label: '失败任务', value: formatNumber(data.value.failedTaskCount || 0), delta: data.value.failedTaskCount ? '需处理' : '无异常' }
])

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
    data.value = await GovernanceApi.dashboardScheduleTask()
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
.rule-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; min-height: 280px; align-content: center; }
.rule-cell { padding: 22px; border-radius: 6px; border: 1px solid #e6ebf2; background: #fbfdff; }
.rule-cell span { color: #667085; }
.rule-cell b { display: block; margin-top: 12px; font-size: 30px; color: #101828; }
.rule-cell.success { border-color: #9be7c0; }
.rule-cell.warning { border-color: #f8d49a; }
.rule-cell.danger { border-color: #f4aaaa; }
.rule-cell.muted { border-color: #d7dce5; }
.mini-chart { height: 250px; display: flex; align-items: flex-end; justify-content: space-around; gap: 12px; padding-top: 20px; }
.chart-col { height: 220px; flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 5px; position: relative; }
.chart-col span { position: absolute; bottom: -22px; color: #667085; font-size: 12px; }
.bar { width: 18px; min-height: 12px; border-radius: 4px 4px 0 0; }
.bar.blue, .blue-dot { background: #2f7bff; }
.bar.orange, .orange-dot { background: #ffa53a; }
.legend { margin-top: 30px; display: flex; gap: 18px; color: #667085; }
.legend i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .panel-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid, .rule-strip { grid-template-columns: 1fr; } }
</style>
