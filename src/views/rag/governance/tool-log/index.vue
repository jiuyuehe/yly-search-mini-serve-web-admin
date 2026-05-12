<template>
  <div class="governance-page tool-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / AI 数据智能治理 / <span>Tool 能力与调用日志</span></div>
          <div class="governance-page-title">Tool 能力与调用日志</div>
          <div class="governance-page-subtitle">展示系统对 AI 暴露的可写入 @Tool 能力、描述、删除风险，以及实际调用审计。</div>
        </div>
        <el-button @click="refresh">
          <Icon icon="ep:refresh" class="mr-5px" />
          刷新
        </el-button>
      </div>
    </ContentWrap>

    <div class="governance-kpi-grid">
      <div class="governance-kpi-card">
        <div class="governance-kpi-label">暴露 Tool</div>
        <div class="governance-kpi-value">{{ catalog.length }}</div>
        <div class="governance-kpi-delta">可写能力 <span>{{ writableCount }}</span></div>
      </div>
      <div class="governance-kpi-card">
        <div class="governance-kpi-label">模块数量</div>
        <div class="governance-kpi-value">{{ moduleGroups.length }}</div>
        <div class="governance-kpi-delta">治理域 <span>已归类</span></div>
      </div>
      <div class="governance-kpi-card">
        <div class="governance-kpi-label">删除类 Tool</div>
        <div class="governance-kpi-value danger">{{ deleteToolCount }}</div>
        <div class="governance-kpi-delta">需 allowDelete <span>保护</span></div>
      </div>
      <div class="governance-kpi-card">
        <div class="governance-kpi-label">调用日志</div>
        <div class="governance-kpi-value">{{ logs.length }}</div>
        <div class="governance-kpi-delta">审计记录 <span>可追溯</span></div>
      </div>
    </div>

    <ContentWrap class="governance-table-panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Tool 能力目录" name="catalog">
          <el-table :data="catalog" stripe class="governance-dense-table">
            <el-table-column label="模块" prop="module" width="150" />
            <el-table-column label="Tool 名称" prop="name" min-width="220" show-overflow-tooltip />
            <el-table-column label="实际方法" prop="canonicalName" min-width="190" show-overflow-tooltip />
            <el-table-column label="属性" width="150">
              <template #default="{ row }">
                <el-tag v-if="row.writable" size="small" type="success">可写入</el-tag>
                <el-tag v-if="row.deleteTool" size="small" type="danger" class="ml-4px">删除类</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="描述" prop="description" min-width="360" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="调用日志" name="logs">
          <el-table :data="logs" stripe class="governance-dense-table">
            <el-table-column label="ID" prop="id" width="80" />
            <el-table-column label="Tool" prop="toolName" min-width="190" />
            <el-table-column label="任务" prop="taskId" width="90" />
            <el-table-column label="规则" prop="ruleId" width="90" />
            <el-table-column label="dry-run" width="90">
              <template #default="{ row }">
                <el-tag :type="row.dryRun ? 'warning' : 'info'">{{ row.dryRun ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="90">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="消息" prop="message" min-width="260" show-overflow-tooltip />
            <el-table-column label="时间" prop="createTime" width="180" />
            <el-table-column label="操作" width="90" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </ContentWrap>

    <el-drawer v-model="detailVisible" title="Tool 调用详情" size="520px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="Tool">{{ currentLog?.toolName }}</el-descriptions-item>
        <el-descriptions-item label="任务 ID">{{ currentLog?.taskId }}</el-descriptions-item>
        <el-descriptions-item label="规则 ID">{{ currentLog?.ruleId }}</el-descriptions-item>
        <el-descriptions-item label="消息">{{ currentLog?.message }}</el-descriptions-item>
      </el-descriptions>
      <pre class="result-json">{{ JSON.stringify(currentLog?.payload || {}, null, 2) }}</pre>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi, GovernanceToolCatalogVO } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceToolLog' })

const activeTab = ref('catalog')
const catalog = ref<GovernanceToolCatalogVO[]>([])
const logs = ref<any[]>([])
const detailVisible = ref(false)
const currentLog = ref<any>()

const writableCount = computed(() => catalog.value.filter((item) => item.writable).length)
const deleteToolCount = computed(() => catalog.value.filter((item) => item.deleteTool).length)
const moduleGroups = computed(() => Array.from(new Set(catalog.value.map((item) => item.module))))

const loadCatalog = async () => {
  catalog.value = await GovernanceApi.listToolCatalog()
}
const loadLogs = async () => {
  logs.value = await GovernanceApi.listToolLogs()
}
const refresh = async () => {
  await Promise.all([loadCatalog(), loadLogs()])
}
const openDetail = (row: any) => {
  currentLog.value = row
  detailVisible.value = true
}

onMounted(refresh)
</script>

<style scoped>
.tool-page { display: flex; flex-direction: column; gap: 12px; }
.result-json { margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e6ebf2; border-radius: 6px; white-space: pre-wrap; }
</style>
