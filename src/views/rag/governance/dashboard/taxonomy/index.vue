<template>
  <div>
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据治理看板 / <span>分类分级看板</span></div>
          <div class="page-title">分类分级看板</div>
        </div>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">{{ item.delta }}</div>
      </div>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="7">
        <ContentWrap class="panel">
          <template #header>主题分类树</template>
          <el-input v-model="keyword" placeholder="搜索主题名称" clearable>
            <template #prefix><Icon icon="ep:search" /></template>
          </el-input>
          <div class="tree-list">
            <div v-for="item in themes" :key="item.name" class="tree-item" :class="{ active: item.name === activeTheme }" @click="activeTheme = item.name">
              <Icon icon="ep:folder-opened" />
              <span>{{ item.name }}</span>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="17">
        <ContentWrap class="panel">
          <template #header>{{ activeTheme }} - 文件列表</template>
          <el-form :inline="true">
            <el-form-item label="分类状态">
              <el-select class="!w-160px" placeholder="全部"><el-option label="全部" value="" /></el-select>
            </el-form-item>
            <el-form-item label="相关度">
              <el-select class="!w-160px" placeholder="全部"><el-option label="全部" value="" /></el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary">搜索</el-button>
              <el-button>导出</el-button>
            </el-form-item>
          </el-form>
          <el-table :data="files" stripe class="dense-table">
            <el-table-column label="文件名称" prop="fileName" min-width="230" show-overflow-tooltip />
            <el-table-column label="分类标签" prop="tag" width="120">
              <template #default="{ row }"><el-tag>{{ row.tag }}</el-tag></template>
            </el-table-column>
            <el-table-column label="相关度" prop="score" width="100" sortable>
              <template #default="{ row }"><span :class="row.score < 0.82 ? 'warn' : 'ok'">{{ row.score }}</span></template>
            </el-table-column>
            <el-table-column label="来源系统" prop="source" width="120" />
            <el-table-column label="更新时间" prop="time" width="160" />
            <el-table-column label="大小" prop="size" width="100" />
            <el-table-column label="操作" width="90">
              <template #default><el-button link type="primary">预览</el-button></template>
            </el-table-column>
          </el-table>
        </ContentWrap>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt-12px">
      <el-col :xs="24" :lg="8">
        <ContentWrap>
          <template #header>分类概览</template>
          <div class="donut-card"><div class="donut"></div><b>14,256</b><span>文件数</span></div>
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="8">
        <ContentWrap>
          <template #header>相关度分布</template>
          <div v-for="item in scoreBars" :key="item.name" class="bar-row">
            <span>{{ item.name }}</span>
            <el-progress :percentage="item.value" />
          </div>
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="8">
        <ContentWrap>
          <template #header>内容标签 TopN</template>
          <div v-for="item in topTags" :key="item.name" class="tag-row">
            <span>{{ item.name }}</span><b>{{ item.count }}</b>
          </div>
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RagGovernanceTaxonomyDashboard' })

const keyword = ref('')
const activeTheme = ref('战略管理')
const kpis = [
  { label: '文件总数', value: '28,560,321', delta: '较昨日 ↑2.35%' },
  { label: '已分类数量', value: '25,843,912', delta: '占比 90.46%' },
  { label: '未分类数量', value: '2,716,409', delta: '占比 9.52%' },
  { label: '高置信文件数', value: '21,362,587', delta: '占比 74.84%' },
  { label: '平均置信度', value: '0.86', delta: '较昨日 ↑0.02' }
]
const themes = [
  { name: '战略管理', count: 6 },
  { name: '经营计划管理', count: 8 },
  { name: '人力资源管理', count: 5 },
  { name: '财务管理', count: 5 },
  { name: '生产运营管理', count: 28 },
  { name: '客户与市场管理', count: 18 },
  { name: '风险与合规管理', count: 12 }
]
const files = [
  { fileName: '公司战略规划(2024-2026).pdf', tag: '战略规划', score: 0.97, source: 'OA系统', time: '2024-05-30 10:30', size: '24.45 MB' },
  { fileName: '年度经营计划.xlsx', tag: '经营计划', score: 0.92, source: 'ERP系统', time: '2024-05-29 09:21', size: '12.34 MB' },
  { fileName: '战略评估报告.pptx', tag: '战略评估', score: 0.90, source: '汇报系统', time: '2024-05-28 16:45', size: '43.18 MB' },
  { fileName: '竞争对手分析报告.pdf', tag: '竞争分析', score: 0.87, source: '市场系统', time: '2024-05-28 14:12', size: '3.41 MB' },
  { fileName: '行业研究白皮书.docx', tag: '行业研究', score: 0.83, source: '研究系统', time: '2024-05-28 10:26', size: '5.92 MB' },
  { fileName: '风险管理手册.xlsx', tag: '风险管理', score: 0.81, source: '风控系统', time: '2024-05-27 11:33', size: '2.54 MB' }
]
const scoreBars = [
  { name: '0-0.2', value: 12 },
  { name: '0.2-0.4', value: 28 },
  { name: '0.4-0.6', value: 46 },
  { name: '0.6-0.8', value: 72 },
  { name: '0.8-1.0', value: 94 }
]
const topTags = [
  { name: '战略规划', count: '3,256' },
  { name: '经营计划', count: '2,845' },
  { name: '战略评估', count: '2,312' },
  { name: '竞争分析', count: '2,056' },
  { name: '风险管理', count: '1,787' }
]
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 28px; font-weight: 800; }
.kpi-delta { margin-top: 10px; color: #12a666; }
.panel { min-height: 430px; }
.tree-list { margin-top: 12px; display: grid; gap: 6px; }
.tree-item { display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: center; padding: 10px; border-radius: 6px; cursor: pointer; }
.tree-item.active { background: #eaf2ff; color: #1f6fff; }
.tree-item em { font-style: normal; color: #667085; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
.ok { color: #12a666; font-weight: 700; }
.warn { color: #f04438; font-weight: 700; }
.donut-card { min-height: 190px; display: grid; place-items: center; color: #101828; }
.donut { width: 150px; height: 150px; border-radius: 50%; background: conic-gradient(#2f7bff 0 26%, #51bd63 26% 48%, #ffb020 48% 64%, #7a5af8 64% 78%, #55c7d9 78% 100%); }
.donut-card b { margin-top: -104px; font-size: 24px; }
.donut-card span { margin-top: -70px; color: #667085; }
.bar-row { display: grid; grid-template-columns: 70px 1fr; gap: 12px; align-items: center; margin-bottom: 12px; }
.tag-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #edf0f5; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .kpi-grid { grid-template-columns: 1fr; } }
</style>
