<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / 数据治理看板 / <span>基础数据看板</span></div>
          <div class="governance-page-title">基础数据资产总览</div>
          <div class="governance-page-subtitle">面向文档、索引、数据源和治理任务的统一资产盘点。</div>
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
        <div class="governance-kpi-delta">治理状态 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <div class="governance-panel-grid">
      <ContentWrap class="governance-panel">
        <template #header>数据类型分布</template>
        <div class="governance-donut-row">
          <div class="governance-donut">
            <strong>{{ formatNumber(data.documentCount || 1268754) }}<span>总文档数</span></strong>
          </div>
          <div class="governance-legend-list">
            <div v-for="item in fileTypes" :key="item.name" class="governance-legend-item">
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.name }}</span>
              <b>{{ item.percent }}</b>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap class="governance-panel">
        <template #header>基础治理健康度</template>
        <div class="governance-status-strip">
          <div v-for="item in healthItems" :key="item.name" class="governance-status-item">
            <span>{{ item.name }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <div class="asset-flow">
          <div v-for="item in assetFlow" :key="item.name" class="asset-node">
            <span>{{ item.name }}</span>
            <b>{{ item.value }}</b>
          </div>
        </div>
      </ContentWrap>
    </div>

    <ContentWrap class="governance-panel">
      <template #header>近 7 天基础数据入湖趋势</template>
      <div class="governance-mini-chart">
        <div v-for="item in trend" :key="item.date" class="governance-chart-col">
          <div class="governance-bar blue" :style="{ height: item.docs + '%' }"></div>
          <div class="governance-bar green" :style="{ height: item.indexes + '%' }"></div>
          <span>{{ item.date }}</span>
        </div>
      </div>
      <div class="governance-legend">
        <span><i class="legend-blue"></i>文档入库</span>
        <span><i class="legend-green"></i>索引写入</span>
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceBaseDashboard' })
const data = ref<any>({})

const formatNumber = (value: number | string) => Number(value || 0).toLocaleString()

const kpiCards = computed(() => [
  { label: '数据总量（条）', value: formatNumber(data.value.dataCount || 28560321), delta: '正常' },
  { label: '文档总量（份）', value: formatNumber(data.value.documentCount || 1268754), delta: '正常' },
  { label: '索引数据量（条）', value: formatNumber(data.value.indexCount || 26843912), delta: '同步中' },
  { label: '数据源系统（个）', value: formatNumber(data.value.sourceSystemCount || 36), delta: '已接入' },
  { label: '文件类型（种）', value: formatNumber(data.value.fileTypeCount || 28), delta: '已识别' },
  { label: '文件实例（个）', value: formatNumber(data.value.fileInstanceCount || data.value.taskCount || 0), delta: data.value.health || 'READY' }
])

const fileTypes = [
  { name: 'PDF', percent: '32.6%', count: '413,996', color: '#2f7bff' },
  { name: 'Word', percent: '24.1%', count: '305,721', color: '#39b76d' },
  { name: 'Excel', percent: '12.3%', count: '156,072', color: '#ffa53a' },
  { name: 'PPT', percent: '7.6%', count: '96,457', color: '#727cf5' },
  { name: '图片', percent: '4.8%', count: '60,997', color: '#55c7d9' }
]

const healthItems = computed(() => [
  { name: '治理规则', value: formatNumber(data.value.ruleCount || 0) },
  { name: '治理任务', value: formatNumber(data.value.taskCount || 0) },
  { name: 'Tool 调用', value: formatNumber(data.value.toolLogCount || 0) },
  { name: '系统状态', value: data.value.health || 'READY' }
])

const assetFlow = computed(() => [
  { name: '数据采集', value: '36 源' },
  { name: '内容解析', value: '1.26M 文档' },
  { name: '向量索引', value: '26.8M 条' },
  { name: '治理沉淀', value: `${data.value.taskCount || 0} 任务` }
])

const trend = [
  { date: '05-02', docs: 42, indexes: 30 },
  { date: '05-03', docs: 55, indexes: 38 },
  { date: '05-04', docs: 68, indexes: 54 },
  { date: '05-05', docs: 62, indexes: 48 },
  { date: '05-06', docs: 78, indexes: 64 },
  { date: '05-07', docs: 88, indexes: 72 },
  { date: '05-08', docs: 72, indexes: 58 }
]

const loadData = async () => {
  data.value = await GovernanceApi.dashboardBase()
}

onMounted(loadData)
</script>

<style scoped>
.asset-flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.asset-node {
  min-height: 122px;
  display: grid;
  place-items: center;
  position: relative;
  padding: 16px;
  background: #fff;
  border: 1px solid #e6ebf2;
  border-radius: 6px;
}

.asset-node + .asset-node::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -10px;
  width: 10px;
  height: 2px;
  background: #2f7bff;
}

.asset-node span {
  color: #667085;
  font-size: 13px;
}

.asset-node b {
  color: #101828;
  font-size: 19px;
}

.legend-blue {
  background: #2f7bff;
}

.legend-green {
  background: #39b76d;
}

@media (max-width: 1200px) {
  .asset-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
