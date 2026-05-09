<template>
  <div>
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>搜索日志看板</span></div>
          <div class="page-title">搜索日志看板</div>
        </div>
      </div>
    </ContentWrap>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">今日搜索量</div>
        <div class="kpi-value">{{ overview.todaySearchCount || 0 }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">独立用户</div>
        <div class="kpi-value">{{ overview.uniqueUserCount || 0 }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">平均耗时</div>
        <div class="kpi-value">{{ overview.avgDurationMs || 0 }}ms</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">无结果率</div>
        <div class="kpi-value">{{ percent(overview.noResultRate) }}</div>
      </div>
    </div>
    <el-row :gutter="12">
      <el-col :xs="24" :lg="12">
        <ContentWrap>
          <template #header>搜索类型分布</template>
          <div v-for="item in data.typeDistribution || []" :key="item.type" class="bar-row">
            <span>{{ item.type }}</span>
            <el-progress :percentage="barPercent(item.count)" :show-text="false" />
            <b>{{ item.count }}</b>
          </div>
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="12">
        <ContentWrap>
          <template #header>热门词 / 无结果词</template>
          <el-table :data="keywordRows" stripe>
            <el-table-column label="类型" prop="type" width="110" />
            <el-table-column label="关键词" prop="keyword" min-width="160" />
            <el-table-column label="次数" prop="count" width="100" />
          </el-table>
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceSearchDashboard' })

const data = ref<any>({})
const overview = computed(() => data.value.overview || {})
const keywordRows = computed(() => [
  ...(data.value.hotKeywords || []).map((item: any) => ({ ...item, type: '热门词' })),
  ...(data.value.noResultKeywords || []).map((item: any) => ({ ...item, type: '无结果词' }))
])
const barPercent = (value: any) => Math.min(100, Number(value || 0))
const percent = (value: any) => `${Math.round(Number(value || 0) * 10000) / 100}%`

onMounted(async () => {
  data.value = await GovernanceApi.dashboardSearch()
})
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.kpi-card { padding: 20px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #667085; }
.kpi-value { margin-top: 12px; font-size: 28px; font-weight: 800; }
.bar-row { display: grid; grid-template-columns: 110px 1fr 80px; align-items: center; gap: 12px; margin-bottom: 14px; }
.bar-row b { text-align: right; }
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>
