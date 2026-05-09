<template>
  <div>
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>数据填充看板</span></div>
          <div class="page-title">数据填充看板</div>
        </div>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">较昨日 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="8">
        <ContentWrap class="panel">
          <template #header>字段填充率 TOP10</template>
          <div v-for="item in fieldRates" :key="item.name" class="rate-row">
            <span>{{ item.name }}</span>
            <el-progress :percentage="item.rate" :show-text="false" />
            <b>{{ item.rate }}%</b>
          </div>
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="8">
        <ContentWrap class="panel">
          <template #header>填充率趋势（近7天）</template>
          <div class="line-panel">
            <div v-for="item in trend" :key="item.date" class="line-point" :style="{ height: item.rate + '%' }">
              <i></i><span>{{ item.date }}</span>
            </div>
          </div>
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="8">
        <ContentWrap class="panel">
          <template #header>来源系统覆盖率</template>
          <div class="donut-block">
            <div class="donut"></div>
            <div class="legend-list">
              <div v-for="item in sources" :key="item.name" class="legend-item">
                <i :style="{ backgroundColor: item.color }"></i>
                <span>{{ item.name }}</span>
                <b>{{ item.rate }}%</b>
              </div>
            </div>
          </div>
        </ContentWrap>
      </el-col>
    </el-row>

    <ContentWrap class="mt-12px">
      <template #header>数据填充任务概览</template>
      <el-table :data="tasks" stripe class="dense-table">
        <el-table-column label="任务名称" prop="name" min-width="220" />
        <el-table-column label="数据源" prop="source" width="140" />
        <el-table-column label="任务类型" prop="type" width="130" />
        <el-table-column label="执行方式" prop="mode" width="120" />
        <el-table-column label="进度" width="180">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" />
          </template>
        </el-table-column>
        <el-table-column label="状态" prop="status" width="110" />
        <el-table-column label="最近执行时间" prop="time" width="170" />
        <el-table-column label="操作" width="90">
          <template #default>
            <el-button link type="primary">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceMetadataFillDashboard' })

const data = ref<any>({})
const kpis = [
  { label: '待填充记录数', value: '78.32%', delta: '↓ 1.12%' },
  { label: '已填充记录数', value: '3,512,642', delta: '↑ +5,331' },
  { label: '待填充字段数', value: '972,341', delta: '↓ -32,118' },
  { label: '已填充字段数', value: '63.45%', delta: '↑ +0.66%' },
  { label: '数据源覆盖率', value: '36.55%', delta: '↑ +0.95%' },
  { label: '人工填充率', value: '36.55%', delta: '↓ -0.95%' }
]
const fieldRates = [
  { name: '手机号', rate: 100 },
  { name: '身份证号', rate: 90 },
  { name: '交易时间', rate: 86 },
  { name: '定易金额', rate: 82 },
  { name: '交易状态', rate: 78 },
  { name: '设备编号', rate: 73 },
  { name: '渠道类型', rate: 68 },
  { name: '用户年龄', rate: 59 },
  { name: '用户性别', rate: 47 },
  { name: '所在城市', rate: 35 }
]
const trend = [
  { date: '05-15', rate: 56 },
  { date: '05-16', rate: 68 },
  { date: '05-17', rate: 72 },
  { date: '05-18', rate: 76 },
  { date: '05-19', rate: 75 },
  { date: '05-20', rate: 77 },
  { date: '05-21', rate: 78 }
]
const sources = [
  { name: 'OA系统', rate: 90, color: '#2f7bff' },
  { name: 'ERP系统', rate: 87, color: '#00a884' },
  { name: 'CRM系统', rate: 81, color: '#ffb020' },
  { name: 'SRM系统', rate: 75, color: '#f04438' },
  { name: '研发平台', rate: 71, color: '#7a5af8' },
  { name: '其他系统', rate: 63, color: '#3861fb' }
]
const tasks = [
  { name: '交易流水数据自动填充', source: '交易数据库', type: '全量填充', mode: '定时任务', progress: 78, status: '运行中', time: '05-21 10:48' },
  { name: '客户信息补全任务', source: 'CRM系统', type: '增量填充', mode: '定时任务', progress: 56, status: '运行中', time: '05-21 10:35' },
  { name: '设备信息标准化填充', source: '物联网平台', type: '全量填充', mode: '手动触发', progress: 100, status: '已完成', time: '05-21 10:20' },
  { name: '订单主数据补全', source: '订单系统', type: '增量填充', mode: '定时任务', progress: 32, status: '运行中', time: '05-21 10:05' }
]

onMounted(async () => {
  data.value = await GovernanceApi.dashboardMetadataFill()
})
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 27px; font-weight: 800; }
.kpi-delta { margin-top: 12px; color: #667085; }
.kpi-delta span { color: #12a666; font-weight: 600; }
.panel { min-height: 340px; }
.rate-row { display: grid; grid-template-columns: 90px 1fr 54px; align-items: center; gap: 12px; margin-bottom: 14px; }
.rate-row b { text-align: right; font-weight: 500; }
.line-panel { height: 260px; display: grid; grid-template-columns: repeat(7, 1fr); align-items: end; gap: 16px; padding: 24px 20px 34px; background: linear-gradient(#fff, #f4f8ff); }
.line-point { position: relative; border-radius: 999px 999px 0 0; background: #2f7bff; }
.line-point i { position: absolute; top: -5px; left: 50%; width: 10px; height: 10px; margin-left: -5px; background: #2f7bff; border-radius: 50%; }
.line-point span { position: absolute; bottom: -28px; left: 50%; transform: translateX(-50%); color: #667085; font-size: 12px; }
.donut-block { display: grid; grid-template-columns: 180px 1fr; align-items: center; gap: 22px; min-height: 260px; }
.donut { width: 160px; height: 160px; border-radius: 50%; background: conic-gradient(#2f7bff 0 25%, #00a884 25% 51%, #ffb020 51% 72%, #f04438 72% 84%, #7a5af8 84% 93%, #3861fb 93% 100%); }
.donut::after { content: ''; display: block; width: 94px; height: 94px; margin: 33px; background: #fff; border-radius: 50%; }
.legend-item { display: grid; grid-template-columns: 10px 1fr 60px; gap: 10px; align-items: center; margin-bottom: 12px; }
.legend-item i { width: 10px; height: 10px; border-radius: 3px; }
.legend-item b { text-align: right; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .kpi-grid { grid-template-columns: 1fr; } .donut-block { grid-template-columns: 1fr; } }
</style>
