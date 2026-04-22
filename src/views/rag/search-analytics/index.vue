<template>
  <ContentWrap>
    <div class="search-hero">
      <div>
        <div class="search-hero__eyebrow">Search Intelligence</div>
        <div class="search-hero__title">搜索统计中心</div>
        <div class="search-hero__desc">把全文搜索、向量搜索、混合搜索、图搜图和文搜图统一沉淀为可分析的搜索历史。</div>
      </div>
    </div>
  </ContentWrap>

  <el-row :gutter="16" class="mb-16px">
    <el-col v-for="item in overviewCards" :key="item.label" :xs="12" :md="4">
      <ContentWrap class="metric-card">
        <div class="metric-card__label">{{ item.label }}</div>
        <div class="metric-card__value">{{ item.value }}</div>
        <div class="metric-card__hint">{{ item.hint }}</div>
      </ContentWrap>
    </el-col>
  </el-row>

  <el-row :gutter="16" class="mb-16px">
    <el-col :xs="24" :md="14">
      <ContentWrap>
        <template #header>搜索趋势</template>
        <div class="trend-list">
          <div v-for="item in trend" :key="item.date" class="trend-row">
            <span>{{ item.date }}</span>
            <div class="trend-row__bar"><span :style="{ width: `${trendPercent(item.count)}%` }"></span></div>
            <b>{{ item.count }}</b>
          </div>
        </div>
      </ContentWrap>
    </el-col>
    <el-col :xs="24" :md="10">
      <ContentWrap>
        <template #header>搜索类型分布</template>
        <div class="type-grid">
          <div v-for="item in typeDistribution" :key="item.type" class="type-pill">
            <span>{{ typeLabel(item.type) }}</span>
            <b>{{ item.count }}</b>
          </div>
        </div>
      </ContentWrap>
    </el-col>
  </el-row>

  <el-row :gutter="16" class="mb-16px">
    <el-col :xs="24" :md="12">
      <ContentWrap>
        <template #header>热门关键词</template>
        <div class="chips">
          <el-tag v-for="item in hotKeywords" :key="item.keyword" effect="plain">{{ item.keyword }}：{{ item.count }}</el-tag>
        </div>
      </ContentWrap>
    </el-col>
    <el-col :xs="24" :md="12">
      <ContentWrap>
        <template #header>无结果关键词</template>
        <div class="chips">
          <el-tag v-for="item in noResultKeywords" :key="item.keyword" type="danger" effect="plain">{{ item.keyword }}：{{ item.count }}</el-tag>
        </div>
      </ContentWrap>
    </el-col>
  </el-row>

  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
      <el-form-item label="关键词">
        <el-input v-model="queryParams.keyword" class="!w-220px" clearable placeholder="搜索关键词" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="queryParams.searchType" class="!w-180px" clearable placeholder="搜索类型">
          <el-option v-for="item in searchTypes" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryParams.success" class="!w-140px" clearable placeholder="状态">
          <el-option label="成功" :value="true" />
          <el-option label="失败" :value="false" />
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
      <el-table-column label="关键词" prop="keyword" min-width="180" show-overflow-tooltip />
      <el-table-column label="类型" width="130">
        <template #default="{ row }">{{ typeLabel(row.searchType) }}</template>
      </el-table-column>
      <el-table-column label="耗时" width="110">
        <template #default="{ row }">{{ row.durationMs || 0 }} ms</template>
      </el-table-column>
      <el-table-column label="结果数" prop="resultCount" width="90" />
      <el-table-column label="召回数" prop="recallCount" width="90" />
      <el-table-column label="Rerank" width="110">
        <template #default="{ row }">
          <el-tag :type="row.rerankStatus === 'success' ? 'success' : row.rerankStatus === 'failed' ? 'danger' : 'info'">
            {{ row.rerankStatus || 'skipped' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="用户" prop="userId" width="100" />
      <el-table-column label="IP" prop="clientIp" width="140" />
      <el-table-column label="时间" prop="createTime" width="180" />
      <el-table-column label="操作" fixed="right" width="90">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-drawer v-model="detailVisible" title="搜索详情" size="46%">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="关键词">{{ current.keyword || '-' }}</el-descriptions-item>
      <el-descriptions-item label="搜索类型">{{ typeLabel(current.searchType) }}</el-descriptions-item>
      <el-descriptions-item label="总耗时">{{ current.durationMs || 0 }} ms</el-descriptions-item>
      <el-descriptions-item label="Rerank耗时">{{ current.rerankDurationMs || 0 }} ms</el-descriptions-item>
      <el-descriptions-item label="结果数">{{ current.resultCount || 0 }}</el-descriptions-item>
      <el-descriptions-item label="无结果">{{ current.resultCount ? '否' : '是' }}</el-descriptions-item>
      <el-descriptions-item label="错误" :span="2">{{ current.errorMessage || '-' }}</el-descriptions-item>
    </el-descriptions>
    <el-divider>请求参数</el-divider>
    <pre class="json-box">{{ prettyJson(current.requestParams) }}</pre>
    <el-divider>Top 结果快照</el-divider>
    <pre class="json-box">{{ prettyJson(current.topResultsSnapshot) }}</pre>
  </el-drawer>
</template>

<script setup lang="ts">
import { SearchAnalyticsApi } from '@/api/rag/search-analytics'

defineOptions({ name: 'RagSearchAnalytics' })

const loading = ref(false)
const detailVisible = ref(false)
const overview = ref<any>({})
const trend = ref<any[]>([])
const typeDistribution = ref<any[]>([])
const hotKeywords = ref<any[]>([])
const noResultKeywords = ref<any[]>([])
const list = ref<any[]>([])
const total = ref(0)
const current = ref<any>({})

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  searchType: '',
  success: undefined as boolean | undefined
})

const searchTypes = [
  { label: '全文/文档', value: 'document' },
  { label: '图搜图', value: 'image_visual' },
  { label: '文搜图', value: 'image_text_vector' },
  { label: '图片列表', value: 'image_list' }
]

const overviewCards = computed(() => [
  { label: '今日搜索', value: overview.value.todaySearchCount || 0, hint: '所有搜索接口' },
  { label: '独立用户', value: overview.value.uniqueUserCount || 0, hint: '按 userId 去重' },
  { label: '平均耗时', value: `${overview.value.avgDurationMs || 0}ms`, hint: '今天平均响应' },
  { label: 'P95 耗时', value: `${overview.value.p95DurationMs || 0}ms`, hint: '慢查询观察' },
  { label: '无结果率', value: `${Math.round((overview.value.noResultRate || 0) * 100)}%`, hint: '检索质量信号' },
  { label: '点击率', value: `${Math.round((overview.value.clickRate || 0) * 100)}%`, hint: '结果有效性' }
])

const maxTrend = computed(() => Math.max(1, ...trend.value.map((item) => item.count || 0)))
const trendPercent = (count?: number) => Math.max(4, Math.round(((count || 0) / maxTrend.value) * 100))

const getList = async () => {
  loading.value = true
  try {
    const data = await SearchAnalyticsApi.getHistoryPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
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

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.searchType = ''
  queryParams.success = undefined
  handleQuery()
}

const openDetail = (row: any) => {
  current.value = row
  detailVisible.value = true
}

const typeLabel = (value?: string) => searchTypes.find((item) => item.value === value)?.label || value || '-'
const prettyJson = (value: any) => {
  if (!value) return '-'
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2)
  } catch {
    return value
  }
}

onMounted(async () => {
  await Promise.all([loadDashboard(), getList()])
})
</script>

<style scoped>
.search-hero {
  min-height: 132px;
  padding: 24px;
  border-radius: 18px;
  color: #2c2416;
  background:
    radial-gradient(circle at 18% 10%, rgba(255, 186, 73, 0.32), transparent 32%),
    linear-gradient(135deg, #fff8e7 0%, #edf7ff 100%);
}
.search-hero__eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.72; }
.search-hero__title { margin-top: 8px; font-size: 28px; font-weight: 800; }
.search-hero__desc { margin-top: 8px; color: #746955; }
.metric-card { min-height: 108px; }
.metric-card__label { color: #776f63; font-size: 13px; }
.metric-card__value { margin-top: 8px; font-size: 25px; font-weight: 800; color: #2f2618; }
.metric-card__hint { margin-top: 4px; color: #9a9286; font-size: 12px; }
.trend-list { display: grid; gap: 12px; }
.trend-row { display: grid; grid-template-columns: 92px 1fr 64px; gap: 12px; align-items: center; }
.trend-row__bar { height: 10px; overflow: hidden; background: #f3eee6; border-radius: 999px; }
.trend-row__bar span { display: block; height: 100%; background: linear-gradient(90deg, #f1a340, #3f8cff); border-radius: inherit; }
.type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.type-pill { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f7f5ef; border-radius: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; min-height: 36px; }
.json-box { padding: 12px; overflow: auto; background: #111827; color: #d1fae5; border-radius: 10px; max-height: 260px; }
</style>
