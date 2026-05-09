<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>基础数据看板</span></div>
          <div class="page-title">AI 大数据治理平台</div>
        </div>
        <el-button type="primary" @click="loadData">
          <Icon icon="ep:refresh" class="mr-5px" />
          刷新看板
        </el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">较昨日 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <div class="panel-grid">
      <ContentWrap class="panel">
        <template #header>文件类型分布（按文档数）</template>
        <div class="donut-row">
          <div class="donut">1,268,754<span>总文档数</span></div>
          <div class="legend-list">
            <div v-for="item in fileTypes" :key="item.name" class="legend-item">
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.name }}</span>
              <b>{{ item.percent }}</b>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap class="panel">
        <template #header>数据源系统分布（按文档数）</template>
        <div class="donut-row">
          <div class="donut source">1,268,754<span>总文档数</span></div>
          <div class="legend-list">
            <div v-for="item in sourceSystems" :key="item.name" class="legend-item">
              <i :style="{ backgroundColor: item.color }"></i>
              <span>{{ item.name }}</span>
              <b>{{ item.percent }}</b>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </div>
      </ContentWrap>
    </div>

    <ContentWrap class="panel">
      <template #header>近 7 天数据量增入趋势</template>
      <div class="trend">
        <div v-for="item in trend" :key="item.date" class="trend-col">
          <div class="bar doc" :style="{ height: item.doc + '%' }"></div>
          <div class="bar data" :style="{ height: item.data + '%' }"></div>
          <span>{{ item.date }}</span>
        </div>
      </div>
      <div class="trend-legend">
        <span><i class="doc-dot"></i> 增入文档量（份）</span>
        <span><i class="data-dot"></i> 增入数据量（条）</span>
      </div>
    </ContentWrap>

    <div class="panel-grid">
      <ContentWrap class="panel">
        <template #header>最近治理任务</template>
        <el-table :data="tasks" stripe class="dense-table">
          <el-table-column label="任务名称" prop="name" min-width="180" show-overflow-tooltip />
          <el-table-column label="规则" prop="ruleId" width="90" />
          <el-table-column label="状态" prop="status" width="110" />
          <el-table-column label="ESID" prop="esId" min-width="180" show-overflow-tooltip />
        </el-table>
      </ContentWrap>
      <ContentWrap class="panel">
        <template #header>最近 Tool 调用</template>
        <el-table :data="toolLogs" stripe class="dense-table">
          <el-table-column label="Tool" prop="toolName" min-width="180" show-overflow-tooltip />
          <el-table-column label="结果" width="90">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="dry-run" prop="dryRun" width="90" />
          <el-table-column label="消息" prop="message" min-width="180" show-overflow-tooltip />
        </el-table>
      </ContentWrap>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceDashboard' })

const base = ref<any>({})
const tasks = ref<any[]>([])
const toolLogs = ref<any[]>([])
const kpiCards = computed(() => [
  { label: '数据总量（条）', value: '28,560,321', delta: '↑ 2.35%' },
  { label: '文档总量（份）', value: '1,268,754', delta: '↑ 1.60%' },
  { label: '索引数据量（条）', value: '26,843,912', delta: '↑ 2.11%' },
  { label: '数据源系统（个）', value: '36', delta: '- 0' },
  { label: '文件类型（种）', value: '28', delta: '↑ 1' },
  { label: '治理任务（个）', value: String(base.value.taskCount || 0), delta: '↑ ' + (base.value.toolLogCount || 0) }
])

const fileTypes = [
  { name: 'PDF', percent: '32.6%', count: '413,996', color: '#2f7bff' },
  { name: 'Word', percent: '24.1%', count: '305,721', color: '#51bd63' },
  { name: 'Excel', percent: '12.3%', count: '156,072', color: '#ffa53a' },
  { name: 'PPT', percent: '7.6%', count: '96,457', color: '#727cf5' },
  { name: 'TXT', percent: '5.2%', count: '66,128', color: '#ff659b' },
  { name: '图片', percent: '4.0%', count: '60,997', color: '#55c7d9' }
]

const sourceSystems = [
  { name: 'ERP系统', percent: '28.9%', count: '365,442', color: '#2f7bff' },
  { name: 'OA系统', percent: '22.7%', count: '288,305', color: '#51bd63' },
  { name: 'CRM系统', percent: '15.3%', count: '193,363', color: '#ffa53a' },
  { name: '研发平台', percent: '11.9%', count: '150,988', color: '#727cf5' },
  { name: '数据库', percent: '9.4%', count: '119,363', color: '#ff659b' },
  { name: '其他系统', percent: '11.9%', count: '150,442', color: '#55c7d9' }
]

const trend = [
  { date: '05-15', doc: 40, data: 20 },
  { date: '05-16', doc: 58, data: 38 },
  { date: '05-17', doc: 60, data: 42 },
  { date: '05-18', doc: 72, data: 50 },
  { date: '05-19', doc: 86, data: 62 },
  { date: '05-20', doc: 82, data: 60 },
  { date: '05-21', doc: 68, data: 46 }
]

const loadData = async () => {
  base.value = await GovernanceApi.dashboardBase()
  tasks.value = (await GovernanceApi.listTasks()).slice(0, 8)
  toolLogs.value = (await GovernanceApi.listToolLogs()).slice(0, 8)
}

onMounted(loadData)
</script>

<style scoped>
.governance-page { color: #101828; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.breadcrumb { color: #667085; font-size: 14px; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.kpi-card { min-height: 118px; padding: 20px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; box-shadow: 0 6px 16px rgb(16 24 40 / 4%); }
.kpi-label { color: #344054; font-size: 14px; }
.kpi-value { margin-top: 14px; color: #101828; font-size: 28px; font-weight: 800; }
.kpi-delta { margin-top: 14px; color: #667085; }
.kpi-delta span { color: #12a666; font-weight: 600; }
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.panel :deep(.el-card__header) { font-size: 18px; font-weight: 700; }
.donut-row { display: grid; grid-template-columns: 240px 1fr; align-items: center; gap: 28px; min-height: 270px; }
.donut { width: 190px; height: 190px; display: grid; place-items: center; border-radius: 50%; background: conic-gradient(#2f7bff 0 34%, #51bd63 34% 58%, #ffa53a 58% 72%, #727cf5 72% 82%, #ff659b 82% 90%, #55c7d9 90% 100%); color: #101828; font-size: 22px; font-weight: 800; }
.donut::before { content: ''; position: absolute; width: 116px; height: 116px; background: #fff; border-radius: 50%; }
.donut { position: relative; }
.donut > * , .donut { z-index: 1; }
.donut span { display: block; margin-top: 8px; font-size: 13px; color: #475467; font-weight: 500; text-align: center; }
.source { background: conic-gradient(#2f7bff 0 30%, #51bd63 30% 54%, #ffa53a 54% 70%, #727cf5 70% 83%, #ff659b 83% 91%, #55c7d9 91% 100%); }
.legend-list { display: grid; gap: 14px; }
.legend-item { display: grid; grid-template-columns: 12px 1fr 64px 80px; align-items: center; gap: 10px; color: #344054; }
.legend-item i { width: 10px; height: 10px; border-radius: 3px; }
.legend-item b { font-weight: 500; text-align: right; }
.legend-item em { color: #475467; font-style: normal; text-align: right; }
.trend { height: 280px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 22px; align-items: end; padding: 24px 40px 8px; border-bottom: 1px solid #e6ebf2; background: linear-gradient(#fff, #f8fbff); }
.trend-col { height: 100%; display: grid; grid-template-columns: 1fr 1fr; align-items: end; gap: 6px; position: relative; }
.trend-col span { position: absolute; left: 50%; bottom: -28px; transform: translateX(-50%); color: #667085; }
.bar { border-radius: 999px 999px 0 0; }
.bar.doc { background: #2f7bff; }
.bar.data { background: #39b76d; }
.trend-legend { margin-top: 42px; display: flex; justify-content: center; gap: 36px; color: #475467; }
.trend-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.doc-dot { background: #2f7bff; }
.data-dot { background: #39b76d; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .panel-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .donut-row { grid-template-columns: 1fr; }
}
</style>
