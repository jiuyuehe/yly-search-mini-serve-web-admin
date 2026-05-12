<template>
  <div class="dashboard-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>MCP 与 Tool Call 调用日志看板</span></div>
          <div class="page-title">工具能力调用审计</div>
          <div class="page-subtitle">统计全系统 Tool 能力、MCP 发布状态、调用趋势和可分页追溯的执行日志。</div>
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
        <template #header>近 7 天调用趋势</template>
        <div class="mini-chart">
          <div v-for="item in trendRows" :key="item.date" class="chart-col">
            <div class="bar blue" :style="{ height: `${trendHeight(item.total)}%` }"></div>
            <div class="bar orange" :style="{ height: `${trendHeight(item.failed)}%` }"></div>
            <span>{{ item.date }}</span>
          </div>
        </div>
        <div class="legend">
          <span><i class="blue-dot"></i>调用</span>
          <span><i class="orange-dot"></i>失败</span>
        </div>
      </ContentWrap>

      <ContentWrap>
        <template #header>模块能力分布</template>
        <div class="legend-list">
          <div v-for="item in moduleRows" :key="item.module" class="legend-item">
            <i :style="{ backgroundColor: item.color }"></i>
            <span>{{ item.module }}</span>
            <el-progress :percentage="item.percent" :show-text="false" />
            <b>{{ item.count }}</b>
          </div>
        </div>
      </ContentWrap>
    </div>

    <div class="panel-grid">
      <ContentWrap>
        <template #header>MCP 发布状态</template>
        <el-table :data="mcpCatalog" stripe height="340">
          <el-table-column label="名称" prop="name" min-width="160" show-overflow-tooltip />
          <el-table-column label="模块" prop="module" width="120" />
          <el-table-column label="协议" prop="protocol" width="150" />
          <el-table-column label="状态" width="150">
            <template #default="{ row }">
              <el-tag :type="row.mcpPublished ? 'success' : 'info'">{{ row.publishStatus || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Endpoint" prop="endpoint" min-width="240" show-overflow-tooltip />
        </el-table>
      </ContentWrap>

      <ContentWrap>
        <template #header>高风险能力</template>
        <el-table :data="riskTools" stripe height="340">
          <el-table-column label="Tool" prop="canonicalName" min-width="190" show-overflow-tooltip />
          <el-table-column label="模块" prop="module" width="120" />
          <el-table-column label="写入" width="90">
            <template #default="{ row }">
              <el-tag :type="row.writable ? 'success' : 'info'">{{ row.writable ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="删除" width="90">
            <template #default="{ row }">
              <el-tag :type="row.deleteTool ? 'danger' : 'info'">{{ row.deleteTool ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </ContentWrap>
    </div>

    <ContentWrap>
      <template #header>Tool Call 调用日志分页</template>
      <div class="toolbar">
        <el-input v-model="logQuery.keyword" clearable placeholder="Tool/消息关键词" class="filter-input" />
        <el-select v-model="logQuery.success" clearable placeholder="全部结果" class="status-select">
          <el-option label="成功" :value="true" />
          <el-option label="失败" :value="false" />
        </el-select>
        <el-select v-model="logQuery.dryRun" clearable placeholder="全部模式" class="status-select">
          <el-option label="dry-run" :value="true" />
          <el-option label="正式执行" :value="false" />
        </el-select>
      </div>
      <el-table :data="pagedLogs" stripe>
        <el-table-column label="日志ID" prop="id" width="90" />
        <el-table-column label="任务ID" prop="taskId" width="90" />
        <el-table-column label="规则ID" prop="ruleId" width="90" />
        <el-table-column label="Tool" prop="toolName" min-width="220" show-overflow-tooltip />
        <el-table-column label="模式" width="100">
          <template #default="{ row }">
            <el-tag :type="row.dryRun ? 'warning' : 'success'">{{ row.dryRun ? 'dry-run' : '正式' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="消息" prop="message" min-width="260" show-overflow-tooltip />
        <el-table-column label="时间" prop="createTime" min-width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openLog(row)">追溯</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination v-model:page="logQuery.pageNo" v-model:limit="logQuery.pageSize" :total="filteredLogs.length" />
    </ContentWrap>

    <el-drawer v-model="detailVisible" title="Tool Call 追溯" size="46%">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="日志ID">{{ currentLog.id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Tool">{{ currentLog.toolName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="任务ID">{{ currentLog.taskId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规则ID">{{ currentLog.ruleId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="dry-run">{{ currentLog.dryRun ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="结果">{{ currentLog.success ? '成功' : '失败' }}</el-descriptions-item>
        <el-descriptions-item label="消息" :span="2">{{ currentLog.message || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>Payload</el-divider>
      <pre class="json-box">{{ prettyJson(currentLog.payload) }}</pre>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi, GovernanceToolCatalogVO } from '@/api/rag/governance'
import { MetadataApi, MetadataMcpPublishVO } from '@/api/rag/metadata'

defineOptions({ name: 'DataGovernanceDashboardToolCall' })

const loading = ref(false)
const detailVisible = ref(false)
const toolCatalog = ref<GovernanceToolCatalogVO[]>([])
const mcpCatalog = ref<MetadataMcpPublishVO[]>([])
const logs = ref<any[]>([])
const currentLog = ref<any>({})
const colors = ['#2f7bff', '#39b76d', '#ffa53a', '#727cf5', '#55c7d9']
const logQuery = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  success: undefined as boolean | undefined,
  dryRun: undefined as boolean | undefined
})

const kpiCards = computed(() => [
  { label: 'Tool 能力数', value: toolCatalog.value.length, delta: '系统能力' },
  { label: 'MCP 发布数', value: mcpCatalog.value.filter((item) => item.mcpPublished).length, delta: '发布目录' },
  { label: '写入能力', value: toolCatalog.value.filter((item) => item.writable).length, delta: '需审计' },
  { label: '删除能力', value: toolCatalog.value.filter((item) => item.deleteTool).length, delta: '强约束' },
  { label: '调用次数', value: logs.value.length, delta: '审计日志' },
  { label: '失败次数', value: logs.value.filter((item) => !item.success).length, delta: '异常记录' }
])
const riskTools = computed(() => toolCatalog.value.filter((item) => item.writable || item.deleteTool))
const moduleRows = computed(() => {
  const counts = toolCatalog.value.reduce((map, item) => {
    map[item.module] = (map[item.module] || 0) + 1
    return map
  }, {} as Record<string, number>)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || 1
  return Object.entries(counts).map(([module, count], index) => ({
    module,
    count,
    color: colors[index % colors.length],
    percent: Math.round((count * 100) / total)
  }))
})
const trendRows = computed(() => {
  const seed = Array.from({ length: 7 }, (_, index) => ({ date: `D-${7 - index}`, total: 0, failed: 0 }))
  logs.value.forEach((log) => {
    const day = dayKey(log.createTime)
    const row = seed.find((item) => item.date === day)
    if (row) {
      row.total += 1
      if (!log.success) row.failed += 1
    }
  })
  return seed
})
const maxTrend = computed(() => Math.max(1, ...trendRows.value.map((item) => item.total)))
const filteredLogs = computed(() => {
  const key = logQuery.keyword.trim().toLowerCase()
  return logs.value.filter((item) => {
    const matchKey = !key || [item.toolName, item.message].join(' ').toLowerCase().includes(key)
    const matchSuccess = logQuery.success === undefined || item.success === logQuery.success
    const matchDryRun = logQuery.dryRun === undefined || item.dryRun === logQuery.dryRun
    return matchKey && matchSuccess && matchDryRun
  })
})
const pagedLogs = computed(() => {
  const start = (logQuery.pageNo - 1) * logQuery.pageSize
  return filteredLogs.value.slice(start, start + logQuery.pageSize)
})

const loadData = async () => {
  loading.value = true
  try {
    const [tools, mcps, toolLogs] = await Promise.all([
      GovernanceApi.listToolCatalog(),
      MetadataApi.getMcpPublishCatalog(),
      GovernanceApi.listToolLogs()
    ])
    toolCatalog.value = tools || []
    mcpCatalog.value = mcps || []
    logs.value = toolLogs || []
  } finally {
    loading.value = false
  }
}
const openLog = (row: any) => {
  currentLog.value = row
  detailVisible.value = true
}
const dayKey = (value?: string) => {
  if (!value) return 'D-1'
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  return `D-${Math.max(1, Math.min(7, diff + 1))}`
}
const trendHeight = (value: number) => Math.max(8, Math.round((Number(value || 0) / maxTrend.value) * 100))
const prettyJson = (value: any) => value ? JSON.stringify(value, null, 2) : '-'

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
.mini-chart { height: 250px; display: flex; align-items: flex-end; justify-content: space-around; gap: 12px; padding-top: 20px; }
.chart-col { height: 220px; flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 5px; position: relative; }
.chart-col span { position: absolute; bottom: -22px; color: #667085; font-size: 12px; }
.bar { width: 18px; min-height: 12px; border-radius: 4px 4px 0 0; }
.bar.blue, .blue-dot { background: #2f7bff; }
.bar.orange, .orange-dot { background: #ffa53a; }
.legend { margin-top: 30px; display: flex; gap: 18px; color: #667085; }
.legend i { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; }
.legend-list { min-height: 250px; display: flex; flex-direction: column; gap: 14px; justify-content: center; }
.legend-item { display: grid; grid-template-columns: 12px 120px 1fr 70px; align-items: center; gap: 10px; color: #475467; }
.legend-item i { width: 10px; height: 10px; border-radius: 2px; }
.legend-item b { text-align: right; color: #101828; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.filter-input { width: 280px; }
.status-select { width: 150px; }
.json-box { max-height: 260px; overflow: auto; padding: 12px; background: #101828; color: #d1fadf; border-radius: 6px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .panel-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head, .toolbar { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } .filter-input, .status-select { width: 100%; } }
</style>
