<template>
  <div>
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / <span>AI 数据智能治理</span></div>
          <div class="page-title">AI 数据智能治理工作台</div>
        </div>
      </div>
    </ContentWrap>
    <el-row :gutter="12">
      <el-col v-for="item in modules" :key="item.title" :xs="24" :sm="12" :lg="8">
        <ContentWrap class="module-card">
          <div class="module-title">{{ item.title }}</div>
          <div class="module-desc">{{ item.desc }}</div>
          <el-button link type="primary" @click="router.push(item.path)">进入</el-button>
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RagGovernance' })
const router = useRouter()
const modules = [
  { title: 'AI 治理规则管理', desc: '提示词、模型、可调用 Tool 与删除权限控制。', path: '/rag/governance/rules' },
  { title: '定时治理任务管理', desc: '复用定时任务体系执行治理规则。', path: '/rag/governance/schedule-task' },
  { title: '数据填充', desc: '基于规则进行 dry-run 测试与结构化填充。', path: '/rag/governance/metadata-fill' },
  { title: 'Tool 调用日志', desc: '追踪模型自动调用业务 Tool 的入参、结果和错误。', path: '/rag/governance/tool-log' },
  { title: '任务日志', desc: '查看 AI 任务执行状态和失败原因。', path: '/rag/governance/task-log' }
]
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.module-card { min-height: 150px; }
.module-title { font-size: 17px; font-weight: 700; }
.module-desc { min-height: 48px; margin: 10px 0 14px; color: #667085; line-height: 1.6; }
</style>
