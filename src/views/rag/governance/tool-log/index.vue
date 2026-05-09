<template>
  <div>
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / AI 数据智能治理 / <span>Tool 调用日志</span></div>
          <div class="page-title">Tool 调用日志</div>
        </div>
        <el-button @click="loadLogs">
          <Icon icon="ep:refresh" class="mr-5px" />
          刷新
        </el-button>
      </div>
    </ContentWrap>

    <ContentWrap>
      <el-table :data="logs" stripe class="dense-table">
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
import { GovernanceApi } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceToolLog' })

const logs = ref<any[]>([])
const detailVisible = ref(false)
const currentLog = ref<any>()

const loadLogs = async () => {
  logs.value = await GovernanceApi.listToolLogs()
}
const openDetail = (row: any) => {
  currentLog.value = row
  detailVisible.value = true
}

onMounted(loadLogs)
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
.result-json { margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e6ebf2; border-radius: 6px; white-space: pre-wrap; }
</style>
