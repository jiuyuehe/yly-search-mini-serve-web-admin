<template>
  <div class="dashboard-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / AI 数据治理 / <span>数据填充看板</span></div>
          <div class="page-title">自建模型数据填充态势</div>
          <div class="page-subtitle">展示元数据模型的数据量、字段容量、填充率、失败记录和最近写入日志。</div>
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
        <template #header>模型填充统计</template>
        <el-table :data="modelStats" stripe height="360">
          <el-table-column label="模型" prop="name" min-width="180" show-overflow-tooltip />
          <el-table-column label="场景" prop="scene" width="120" />
          <el-table-column label="字段数" prop="fieldCount" width="100" />
          <el-table-column label="数据量" prop="resultCount" width="120" />
          <el-table-column label="字段容量" prop="fieldCapacity" width="120" />
          <el-table-column label="索引" width="100">
            <template #default="{ row }">
              <el-tag :type="row.indexExists ? 'success' : 'warning'">{{ row.indexExists ? '正常' : '缺失' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </ContentWrap>

      <ContentWrap>
        <template #header>字段填充率</template>
        <div class="rate-wrap">
          <el-progress type="dashboard" :percentage="fieldFillRate" :width="190" />
          <div class="rate-info">
            <div class="rate-row"><span>已填字段</span><b>{{ formatNumber(data.filledFieldCount) }}</b></div>
            <div class="rate-row"><span>字段容量</span><b>{{ formatNumber(data.fieldCapacity) }}</b></div>
            <div class="rate-row"><span>失败记录</span><b>{{ formatNumber(data.failedCount) }}</b></div>
            <div class="rate-row"><span>模型记录</span><b>{{ formatNumber(data.recordCount) }}</b></div>
          </div>
        </div>
      </ContentWrap>
    </div>

    <div class="panel-grid">
      <ContentWrap>
        <template #header>失败记录</template>
        <el-table :data="failedRecords" stripe height="360">
          <el-table-column label="任务ID" prop="taskId" width="90" />
          <el-table-column label="规则ID" prop="ruleId" width="90" />
          <el-table-column label="Tool" prop="toolName" min-width="190" show-overflow-tooltip />
          <el-table-column label="消息" prop="message" min-width="260" show-overflow-tooltip />
          <el-table-column label="时间" prop="createTime" min-width="170" />
        </el-table>
      </ContentWrap>

      <ContentWrap>
        <template #header>最近填充日志</template>
        <el-table :data="recentToolLogs" stripe height="360">
          <el-table-column label="任务ID" prop="taskId" width="90" />
          <el-table-column label="Tool" prop="toolName" min-width="190" show-overflow-tooltip />
          <el-table-column label="dry-run" width="100">
            <template #default="{ row }">
              <el-tag :type="row.dryRun ? 'warning' : 'success'">{{ row.dryRun ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="100">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="消息" prop="message" min-width="220" show-overflow-tooltip />
        </el-table>
      </ContentWrap>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'AiDataGovernanceFillDashboard' })

const loading = ref(false)
const data = ref<Record<string, any>>({})

const modelStats = computed(() => data.value.modelStats || [])
const failedRecords = computed(() => data.value.failedRecords || [])
const recentToolLogs = computed(() => data.value.recentToolLogs || [])
const fieldFillRate = computed(() => Number(data.value.fieldFillRate || 0))
const kpiCards = computed(() => [
  { label: '元数据模型', value: formatNumber(data.value.modelCount), delta: '自建模型' },
  { label: '模型数据量', value: formatNumber(data.value.recordCount), delta: '结果记录' },
  { label: '字段容量', value: formatNumber(data.value.fieldCapacity), delta: '字段 x 数据' },
  { label: '已填字段', value: formatNumber(data.value.filledFieldCount), delta: `${fieldFillRate.value}%` },
  { label: '失败记录', value: formatNumber(data.value.failedCount), delta: Number(data.value.failedCount || 0) ? '需处理' : '无异常' },
  { label: '写入日志', value: formatNumber(recentToolLogs.value.length), delta: '最近记录' }
])

const loadData = async () => {
  loading.value = true
  try {
    data.value = await GovernanceApi.dashboardMetadataFill()
  } finally {
    loading.value = false
  }
}

const formatNumber = (value: number | string | undefined) => Number(value || 0).toLocaleString()

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
.rate-wrap { min-height: 360px; display: grid; grid-template-columns: 220px 1fr; gap: 20px; align-items: center; }
.rate-info { display: flex; flex-direction: column; gap: 12px; }
.rate-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eef2f7; color: #667085; }
.rate-row b { color: #101828; font-size: 18px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .panel-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid, .rate-wrap { grid-template-columns: 1fr; } }
</style>
