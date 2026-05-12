<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / AI 数据治理 / <span>Tool 与 MCP 能力管理</span></div>
          <div class="page-title">全系统工具能力目录</div>
          <div class="page-subtitle">统一查看主题、元数据、图谱、音视频等模块暴露给 Agent 的能力和调用记录。</div>
        </div>
        <el-button type="primary" @click="loadData"><Icon icon="ep:refresh" class="mr-5px" />刷新目录</el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid" v-loading="loading">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">{{ item.delta }}</div>
      </div>
    </div>

    <ContentWrap>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="全系统 Tool 能力" name="tools">
          <div class="toolbar">
            <el-input v-model="keyword" clearable placeholder="按名称、模块、描述筛选" class="filter-input" />
            <el-select v-model="moduleFilter" clearable placeholder="全部模块" class="module-select">
              <el-option v-for="item in modules" :key="item" :label="item" :value="item" />
            </el-select>
          </div>
          <el-table :data="filteredTools" stripe>
            <el-table-column label="能力名称" prop="name" min-width="180" show-overflow-tooltip />
            <el-table-column label="规范名称" prop="canonicalName" min-width="220" show-overflow-tooltip />
            <el-table-column label="模块" prop="module" width="130" />
            <el-table-column label="说明" prop="description" min-width="260" show-overflow-tooltip />
            <el-table-column label="写入" width="90">
              <template #default="{ row }">
                <el-tag :type="row.writable ? 'success' : 'info'">{{ row.writable ? '支持' : '只读' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="删除" width="90">
              <template #default="{ row }">
                <el-tag :type="row.deleteTool ? 'danger' : 'info'">{{ row.deleteTool ? '支持' : '否' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="MCP 发布管理" name="mcp">
          <el-table :data="mcpCatalog" stripe>
            <el-table-column label="MCP 名称" prop="name" min-width="180" show-overflow-tooltip />
            <el-table-column label="规范名称" prop="canonicalName" min-width="220" show-overflow-tooltip />
            <el-table-column label="模块" prop="module" width="130" />
            <el-table-column label="协议" prop="protocol" width="120" />
            <el-table-column label="Endpoint" prop="endpoint" min-width="260" show-overflow-tooltip />
            <el-table-column label="发布状态" width="120">
              <template #default="{ row }">
                <el-tag :type="row.mcpPublished ? 'success' : 'info'">{{ row.publishStatus || (row.mcpPublished ? '已发布' : '未发布') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="写入/删除" width="130">
              <template #default="{ row }">
                <el-tag :type="row.writable ? 'success' : 'info'">{{ row.writable ? '写入' : '只读' }}</el-tag>
                <el-tag v-if="row.deleteTool" type="danger" class="ml-6px">删除</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="调用日志" name="logs">
          <el-table :data="toolLogs" stripe>
            <el-table-column label="日志ID" prop="id" width="90" />
            <el-table-column label="任务ID" prop="taskId" width="100" />
            <el-table-column label="规则ID" prop="ruleId" width="100" />
            <el-table-column label="Tool" prop="toolName" min-width="220" show-overflow-tooltip />
            <el-table-column label="dry-run" width="100">
              <template #default="{ row }">
                <el-tag :type="row.dryRun ? 'warning' : 'success'">{{ row.dryRun ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="消息" prop="message" min-width="260" show-overflow-tooltip />
            <el-table-column label="时间" prop="createTime" min-width="170" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi, GovernanceToolCatalogVO } from '@/api/rag/governance'
import { MetadataApi, MetadataMcpPublishVO } from '@/api/rag/metadata'

defineOptions({ name: 'AiDataGovernanceTools' })

const loading = ref(false)
const activeTab = ref('tools')
const keyword = ref('')
const moduleFilter = ref('')
const toolCatalog = ref<GovernanceToolCatalogVO[]>([])
const mcpCatalog = ref<MetadataMcpPublishVO[]>([])
const toolLogs = ref<any[]>([])

const modules = computed(() => Array.from(new Set(toolCatalog.value.map((item) => item.module).filter(Boolean))))
const filteredTools = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return toolCatalog.value.filter((item) => {
    const matchModule = !moduleFilter.value || item.module === moduleFilter.value
    const matchKeyword = !key || [item.name, item.canonicalName, item.module, item.description]
      .join(' ')
      .toLowerCase()
      .includes(key)
    return matchModule && matchKeyword
  })
})
const kpis = computed(() => [
  { label: 'Tool 总数', value: toolCatalog.value.length, delta: 'Agent 可用能力' },
  { label: '写入 Tool', value: toolCatalog.value.filter((item) => item.writable).length, delta: '可变更数据' },
  { label: '删除 Tool', value: toolCatalog.value.filter((item) => item.deleteTool).length, delta: '强约束能力' },
  { label: 'MCP 能力', value: mcpCatalog.value.length, delta: '发布目录' },
  { label: '已发布 MCP', value: mcpCatalog.value.filter((item) => item.mcpPublished).length, delta: '外部可用' },
  { label: '调用日志', value: toolLogs.value.length, delta: '审计记录' }
])

const loadData = async () => {
  loading.value = true
  try {
    const [tools, mcps, logs] = await Promise.all([
      GovernanceApi.listToolCatalog(),
      MetadataApi.getMcpPublishCatalog(),
      GovernanceApi.listToolLogs()
    ])
    toolCatalog.value = tools || []
    mcpCatalog.value = mcps || []
    toolLogs.value = logs || []
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.governance-page { display: flex; flex-direction: column; gap: 12px; }
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
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
.filter-input { width: 360px; }
.module-select { width: 180px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .page-head, .toolbar { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } .filter-input, .module-select { width: 100%; } }
</style>
