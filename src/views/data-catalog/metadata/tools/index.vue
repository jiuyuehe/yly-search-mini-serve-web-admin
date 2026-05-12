<template>
  <div class="metadata-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 元数据数据建模 / <span>模型 Tools / MCP</span></div>
          <div class="page-title">模型 Tools / MCP 发布管理</div>
        </div>
        <el-button @click="refresh"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">元数据 Tool</div><div class="kpi-value">{{ tools.length }}</div><div class="kpi-delta">可写能力</div></div>
      <div class="kpi-card"><div class="kpi-label">MCP 发布</div><div class="kpi-value">{{ publishedCount }}</div><div class="kpi-delta">平台内状态</div></div>
      <div class="kpi-card"><div class="kpi-label">删除类</div><div class="kpi-value danger">{{ deleteCount }}</div><div class="kpi-delta">需保护</div></div>
      <div class="kpi-card"><div class="kpi-label">调用日志</div><div class="kpi-value">{{ metadataLogs.length }}</div><div class="kpi-delta">可追溯</div></div>
    </div>

    <ContentWrap class="panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Tool 能力目录" name="tools">
          <el-table v-loading="loading" :data="tools" stripe class="dense-table">
            <el-table-column label="Tool 名称" prop="name" min-width="220" show-overflow-tooltip />
            <el-table-column label="实际方法" prop="canonicalName" min-width="180" show-overflow-tooltip />
            <el-table-column label="属性" width="150">
              <template #default="{ row }">
                <el-tag v-if="row.writable" size="small" type="success">可写入</el-tag>
                <el-tag v-if="row.deleteTool" size="small" type="danger" class="ml-4px">删除类</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="描述" prop="description" min-width="360" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="MCP 发布状态" name="mcp">
          <el-table v-loading="loading" :data="mcpItems" stripe class="dense-table">
            <el-table-column label="MCP 能力" prop="name" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="160">
              <template #default="{ row }">
                <el-tag :type="row.publishStatus === 'PLATFORM_READY' ? 'success' : 'warning'">{{ statusText(row.publishStatus) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="协议" prop="protocol" width="190" show-overflow-tooltip />
            <el-table-column label="Endpoint" prop="endpoint" min-width="260" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="调用日志" name="logs">
          <el-table v-loading="loading" :data="metadataLogs" stripe class="dense-table">
            <el-table-column label="ID" prop="id" width="80" />
            <el-table-column label="Tool" prop="toolName" min-width="220" show-overflow-tooltip />
            <el-table-column label="任务" prop="taskId" width="90" />
            <el-table-column label="规则" prop="ruleId" width="90" />
            <el-table-column label="结果" width="90">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="消息" prop="message" min-width="260" show-overflow-tooltip />
            <el-table-column label="时间" prop="createTime" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi, GovernanceToolCatalogVO } from '@/api/rag/governance'
import { MetadataApi, MetadataMcpPublishVO } from '@/api/rag/metadata'

defineOptions({ name: 'DataCatalogMetadataTools' })

const loading = ref(false)
const activeTab = ref('tools')
const tools = ref<GovernanceToolCatalogVO[]>([])
const mcpItems = ref<MetadataMcpPublishVO[]>([])
const logs = ref<any[]>([])
const names = computed(() => new Set(tools.value.flatMap((item) => [item.name, item.canonicalName])))
const metadataLogs = computed(() => logs.value.filter((item) => names.value.has(item.toolName)))
const publishedCount = computed(() => mcpItems.value.filter((item) => item.mcpPublished).length)
const deleteCount = computed(() => tools.value.filter((item) => item.deleteTool).length)

const refresh = async () => {
  loading.value = true
  try {
    const [catalog, mcpCatalog, logData] = await Promise.all([
      GovernanceApi.listToolCatalog(),
      MetadataApi.getMcpPublishCatalog(),
      GovernanceApi.listToolLogs()
    ])
    tools.value = (catalog || []).filter((item) => item.module === '元数据管理')
    mcpItems.value = mcpCatalog || []
    logs.value = logData || []
  } finally {
    loading.value = false
  }
}

const statusText = (status?: string) => {
  if (status === 'PLATFORM_READY') return '已发布'
  if (status === 'REQUIRES_DELETE_GUARD') return '需删除保护'
  return status || '-'
}

onMounted(refresh)
</script>

<style scoped>
.metadata-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 28px; font-weight: 800; }
.kpi-value.danger { color: #d92d20; }
.kpi-delta { margin-top: 10px; color: #12a666; }
.panel { min-height: 430px; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } }
</style>
