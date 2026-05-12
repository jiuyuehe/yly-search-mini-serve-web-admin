<template>
  <div class="dashboard-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>搜索日志看板</span></div>
          <div class="page-title">搜索行为与命中质量</div>
          <div class="page-subtitle">展示搜索总量、热词、命中率、趋势和可分页追溯的搜索日志。</div>
        </div>
        <el-button type="primary" @click="reloadAll"><Icon icon="ep:refresh" class="mr-5px" />刷新看板</el-button>
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
        <template #header>近 7 天搜索趋势</template>
        <div class="mini-chart">
          <div v-for="item in trendRows" :key="item.date" class="chart-col">
            <div class="bar blue" :style="{ height: `${trendHeight(item.count)}%` }"></div>
            <span>{{ shortDate(item.date) }}</span>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap>
        <template #header>搜索类型分布</template>
        <div class="legend-list">
          <div v-for="item in typeRows" :key="item.type" class="legend-item">
            <i :style="{ backgroundColor: item.color }"></i>
            <span>{{ typeLabel(item.type) }}</span>
            <el-progress :percentage="item.percent" :show-text="false" />
            <b>{{ item.count }}</b>
          </div>
        </div>
      </ContentWrap>
    </div>

    <div class="panel-grid">
      <ContentWrap>
        <template #header>热门关键词</template>
        <el-table :data="hotKeywords" stripe height="320">
          <el-table-column label="关键词" prop="keyword" min-width="180" show-overflow-tooltip />
          <el-table-column label="搜索次数" prop="count" width="120" />
        </el-table>
      </ContentWrap>

      <ContentWrap>
        <template #header>无结果关键词</template>
        <el-table :data="noResultKeywords" stripe height="320">
          <el-table-column label="关键词" prop="keyword" min-width="180" show-overflow-tooltip />
          <el-table-column label="无结果次数" prop="count" width="130" />
        </el-table>
      </ContentWrap>
    </div>

    <ContentWrap>
      <template #header>搜索日志分页</template>
      <div class="toolbar">
        <el-input v-model="query.keyword" clearable placeholder="关键词" class="filter-input" @keyup.enter="getList" />
        <el-select v-model="query.searchType" clearable placeholder="全部类型" class="type-select" @change="getList">
          <el-option v-for="item in searchTypes" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="query.success" clearable placeholder="全部状态" class="status-select" @change="getList">
          <el-option label="成功" :value="true" />
          <el-option label="失败" :value="false" />
        </el-select>
        <el-button @click="handleQuery">查询</el-button>
      </div>
      <el-table v-loading="listLoading" :data="list" stripe>
        <el-table-column label="关键词" prop="keyword" min-width="180" show-overflow-tooltip />
        <el-table-column label="搜索类型" width="140">
          <template #default="{ row }">{{ typeLabel(row.searchType) }}</template>
        </el-table-column>
        <el-table-column label="命中" width="100">
          <template #default="{ row }">
            <el-tag :type="Number(row.resultCount || 0) > 0 ? 'success' : 'warning'">
              {{ Number(row.resultCount || 0) > 0 ? '命中' : '无结果' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结果数" prop="resultCount" width="100" />
        <el-table-column label="耗时(ms)" prop="durationMs" width="110" />
        <el-table-column label="用户" prop="userId" width="100" />
        <el-table-column label="IP" prop="clientIp" width="140" />
        <el-table-column label="时间" prop="createTime" min-width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">追溯</el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination v-model:page="query.pageNo" v-model:limit="query.pageSize" :total="total" @pagination="getList" />
    </ContentWrap>

    <el-drawer v-model="detailVisible" title="搜索日志追溯" size="46%">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="关键词">{{ current.keyword || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeLabel(current.searchType) }}</el-descriptions-item>
        <el-descriptions-item label="总耗时">{{ current.durationMs || 0 }} ms</el-descriptions-item>
        <el-descriptions-item label="结果数">{{ current.resultCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="召回数">{{ current.recallCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="Rerank">{{ current.rerankStatus || 'skipped' }}</el-descriptions-item>
        <el-descriptions-item label="错误" :span="2">{{ current.errorMessage || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>请求参数</el-divider>
      <pre class="json-box">{{ prettyJson(current.requestParams) }}</pre>
      <el-divider>Top 结果快照</el-divider>
      <pre class="json-box">{{ prettyJson(current.topResultsSnapshot) }}</pre>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { SearchAnalyticsApi } from '@/api/rag/search-analytics'

defineOptions({ name: 'DataGovernanceDashboardSearch' })

const loading = ref(false)
const listLoading = ref(false)
const detailVisible = ref(false)
const overview = ref<Record<string, any>>({})
const trend = ref<any[]>([])
const typeDistribution = ref<any[]>([])
const hotKeywords = ref<any[]>([])
const noResultKeywords = ref<any[]>([])
const list = ref<any[]>([])
const total = ref(0)
const current = ref<any>({})
const query = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  searchType: '',
  success: undefined as boolean | undefined
})
const colors = ['#2f7bff', '#39b76d', '#ffa53a', '#727cf5', '#55c7d9']
const searchTypes = [
  { label: '全文/文档', value: 'document' },
  { label: '图搜图', value: 'image_visual' },
  { label: '文搜图', value: 'image_text_vector' },
  { label: '图片列表', value: 'image_list' }
]

const noResultRate = computed(() => Number(overview.value.noResultRate || 0))
const hitRate = computed(() => Math.max(0, 100 - Math.round(noResultRate.value * 100)))
const kpiCards = computed(() => [
  { label: '今日搜索总量', value: formatNumber(overview.value.todaySearchCount), delta: '搜索总量' },
  { label: '独立用户', value: formatNumber(overview.value.uniqueUserCount), delta: '按用户去重' },
  { label: '命中率', value: `${hitRate.value}%`, delta: '1 - 无结果率' },
  { label: '无结果率', value: `${Math.round(noResultRate.value * 100)}%`, delta: '检索质量' },
  { label: '平均耗时', value: `${overview.value.avgDurationMs || 0} ms`, delta: '响应性能' },
  { label: 'P95 耗时', value: `${overview.value.p95DurationMs || 0} ms`, delta: '慢查询' }
])
const trendRows = computed(() => trend.value.length ? trend.value : buildEmptyTrend())
const maxTrend = computed(() => Math.max(1, ...trendRows.value.map((item) => Number(item.count || 0))))
const typeRows = computed(() => {
  const totalCount = typeDistribution.value.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1
  return typeDistribution.value.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
    percent: Math.round((Number(item.count || 0) * 100) / totalCount)
  }))
})

const reloadAll = async () => {
  loading.value = true
  try {
    await Promise.all([loadDashboard(), getList()])
  } finally {
    loading.value = false
  }
}
const loadDashboard = async () => {
  const [overviewData, trendData, typeData, hotData, noResultData] = await Promise.all([
    SearchAnalyticsApi.getOverview(),
    SearchAnalyticsApi.getTrend({ days: 7 }),
    SearchAnalyticsApi.getTypeDistribution(),
    SearchAnalyticsApi.getHotKeywords(),
    SearchAnalyticsApi.getNoResultKeywords()
  ])
  overview.value = overviewData || {}
  trend.value = trendData || []
  typeDistribution.value = typeData || []
  hotKeywords.value = hotData || []
  noResultKeywords.value = noResultData || []
}
const getList = async () => {
  listLoading.value = true
  try {
    const data = await SearchAnalyticsApi.getHistoryPage(query)
    list.value = data?.list || []
    total.value = Number(data?.total || 0)
  } finally {
    listLoading.value = false
  }
}
const handleQuery = () => {
  query.pageNo = 1
  getList()
}
const openDetail = (row: any) => {
  current.value = row
  detailVisible.value = true
}
const buildEmptyTrend = () => Array.from({ length: 7 }, (_, index) => ({ date: `D-${7 - index}`, count: 0 }))
const trendHeight = (count: number) => Math.max(8, Math.round((Number(count || 0) / maxTrend.value) * 100))
const shortDate = (date: string) => date?.length > 5 ? date.slice(5) : date
const formatNumber = (value: number | string | undefined) => Number(value || 0).toLocaleString()
const typeLabel = (value?: string) => searchTypes.find((item) => item.value === value)?.label || value || '-'
const prettyJson = (value: any) => {
  if (!value) return '-'
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2)
  } catch {
    return value
  }
}

onMounted(reloadAll)
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
.chart-col { height: 220px; flex: 1; display: flex; align-items: flex-end; justify-content: center; position: relative; }
.chart-col span { position: absolute; bottom: -22px; color: #667085; font-size: 12px; }
.bar { width: 24px; min-height: 12px; border-radius: 4px 4px 0 0; }
.bar.blue { background: #2f7bff; }
.legend-list { min-height: 250px; display: flex; flex-direction: column; gap: 14px; justify-content: center; }
.legend-item { display: grid; grid-template-columns: 12px 120px 1fr 70px; align-items: center; gap: 10px; color: #475467; }
.legend-item i { width: 10px; height: 10px; border-radius: 2px; }
.legend-item b { text-align: right; color: #101828; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.filter-input { width: 260px; }
.type-select { width: 170px; }
.status-select { width: 140px; }
.json-box { max-height: 260px; overflow: auto; padding: 12px; background: #101828; color: #d1fadf; border-radius: 6px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .panel-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head, .toolbar { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } .filter-input, .type-select, .status-select { width: 100%; } }
</style>
