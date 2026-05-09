<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / 数据治理看板 / <span>定时任务看板</span></div>
          <div class="governance-page-title">定时治理任务监控</div>
          <div class="governance-page-subtitle">跟踪启停状态、最近执行结果、失败任务与调度进度。</div>
        </div>
        <el-button type="primary" @click="loadData">
          <Icon icon="ep:refresh" class="mr-5px" />
          刷新看板
        </el-button>
      </div>
    </ContentWrap>

    <div class="governance-kpi-grid schedule-kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="governance-kpi-card">
        <div class="governance-kpi-label">{{ item.label }}</div>
        <div class="governance-kpi-value">{{ item.value }}</div>
        <div class="governance-kpi-delta">调度状态 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <div class="governance-panel-grid">
      <ContentWrap class="governance-panel">
        <template #header>任务进度</template>
        <div class="progress-list">
          <div v-for="item in progressRows" :key="item.name" class="progress-item">
            <div class="progress-title">
              <span>{{ item.name }}</span>
              <b>{{ item.percent }}%</b>
            </div>
            <el-progress :percentage="item.percent" :color="item.color" :stroke-width="10" />
          </div>
        </div>
      </ContentWrap>

      <ContentWrap class="governance-panel">
        <template #header>近 7 天调度执行趋势</template>
        <div class="governance-mini-chart">
          <div v-for="item in trend" :key="item.date" class="governance-chart-col">
            <div class="governance-bar blue" :style="{ height: item.executed + '%' }"></div>
            <div class="governance-bar orange" :style="{ height: item.failed + '%' }"></div>
            <span>{{ item.date }}</span>
          </div>
        </div>
        <div class="governance-legend">
          <span><i class="legend-blue"></i>最近执行</span>
          <span><i class="legend-orange"></i>失败任务</span>
        </div>
      </ContentWrap>
    </div>

    <ContentWrap class="governance-table-panel">
      <template #header>最近执行任务</template>
      <el-table :data="latestTasks" stripe class="governance-dense-table">
        <el-table-column label="ID" prop="id" width="90" />
        <el-table-column label="任务名称" prop="name" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" prop="status" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="180">
          <template #default="{ $index }">
            <el-progress :percentage="taskProgress($index)" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column label="ESID" prop="esId" min-width="220" show-overflow-tooltip />
      </el-table>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceScheduleDashboard' })
const data = ref<any>({})

const formatNumber = (value: number | string) => Number(value || 0).toLocaleString()

const latestTasks = computed(() => data.value.latestTasks || [])

const kpiCards = computed(() => [
  { label: '启用任务', value: formatNumber(data.value.enabledRuleCount || 0), delta: '运行中' },
  { label: '暂停任务', value: formatNumber(data.value.pausedRuleCount || 0), delta: '待确认' },
  { label: '最近执行', value: formatNumber(latestTasks.value.length), delta: '已同步' },
  { label: '失败任务', value: formatNumber(data.value.failedTaskCount || 0), delta: data.value.failedTaskCount ? '需处理' : '无异常' },
  { label: '治理任务', value: formatNumber(data.value.governanceTaskCount || 0), delta: '总量' },
  { label: '调度健康度', value: data.value.health || '98.6%', delta: '稳定' }
])

const progressRows = computed(() => [
  { name: '摘要与正文分析', percent: 92, color: '#2f7bff' },
  { name: '分类分级绑定', percent: 86, color: '#39b76d' },
  { name: '元数据填充', percent: 74, color: '#ffa53a' },
  { name: '图谱投影刷新', percent: 68, color: '#727cf5' }
])

const trend = [
  { date: '05-02', executed: 38, failed: 8 },
  { date: '05-03', executed: 52, failed: 10 },
  { date: '05-04', executed: 64, failed: 12 },
  { date: '05-05', executed: 70, failed: 14 },
  { date: '05-06', executed: 82, failed: 9 },
  { date: '05-07', executed: 76, failed: 11 },
  { date: '05-08', executed: 88, failed: 7 }
]

const statusType = (status?: string) => {
  if (!status) return 'info'
  if (['SUCCESS', 'FINISHED', 'DONE'].includes(status)) return 'success'
  if (['FAILED', 'ERROR'].includes(status)) return 'danger'
  if (['RUNNING', 'PROCESSING'].includes(status)) return 'warning'
  return 'info'
}

const taskProgress = (index: number) => [100, 86, 72, 64, 58, 42, 35, 22][index] || 60

const loadData = async () => {
  data.value = await GovernanceApi.dashboardScheduleTask()
}

onMounted(loadData)
</script>

<style scoped>
.schedule-kpi-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.progress-list {
  display: grid;
  gap: 22px;
  padding: 10px 4px;
}

.progress-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #344054;
  font-size: 14px;
}

.progress-title b {
  color: #101828;
}

.legend-blue {
  background: #2f7bff;
}

.legend-orange {
  background: #ffa53a;
}
</style>
