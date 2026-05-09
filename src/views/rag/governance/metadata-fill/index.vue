<template>
  <div class="governance-page fill-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / AI 数据智能治理 / <span>数据填充</span></div>
          <div class="governance-page-title">治理规则数据填充</div>
          <div class="governance-page-subtitle">支持规则 dry-run 测试、结果追溯、任务日志与 Tool 调用日志查看。</div>
        </div>
        <el-button @click="goToolLog">
          <Icon icon="ep:tickets" class="mr-5px" />
          Tool 日志
        </el-button>
      </div>
    </ContentWrap>

    <div class="governance-kpi-grid fill-kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="governance-kpi-card">
        <div class="governance-kpi-label">{{ item.label }}</div>
        <div class="governance-kpi-value">{{ item.value }}</div>
        <div class="governance-kpi-delta">执行状态 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="8">
        <ContentWrap class="governance-panel">
          <template #header>执行配置</template>
          <el-form label-width="92px">
            <el-form-item label="治理规则">
              <el-select v-model="form.ruleId" class="!w-full" filterable @change="onRuleChange">
                <el-option v-for="rule in rules" :key="rule.id || rule.name" :label="rule.name" :value="Number(rule.id)" />
              </el-select>
            </el-form-item>
            <el-form-item label="任务 ID">
              <el-input-number v-model="form.taskId" class="!w-full" :min="1" />
            </el-form-item>
            <el-form-item label="ESID">
              <el-input v-model="form.esId" placeholder="目标文档 esId" />
            </el-form-item>
            <el-form-item label="Tool">
              <el-select v-model="form.toolName" class="!w-full" filterable>
                <el-option v-for="tool in currentRule?.allowedTools || []" :key="tool" :label="tool" :value="tool" />
              </el-select>
            </el-form-item>
            <el-form-item label="Payload">
              <el-input
                v-model="form.payloadText"
                type="textarea"
                :rows="7"
                placeholder='{"modelId": 1, "options": {"chunkSeconds": 5}}'
              />
            </el-form-item>
            <el-form-item label="dry-run">
              <el-switch v-model="form.dryRun" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="execute">
                <Icon icon="ep:video-play" class="mr-5px" />
                测试执行
              </el-button>
            </el-form-item>
          </el-form>
        </ContentWrap>
      </el-col>

      <el-col :xs="24" :lg="16">
        <ContentWrap class="governance-panel">
          <template #header>执行结果</template>
          <el-empty v-if="!result" description="暂无执行结果" />
          <template v-else>
            <el-alert :title="result.message" :type="result.success ? 'success' : 'error'" show-icon :closable="false" />
            <pre class="result-json">{{ JSON.stringify(result, null, 2) }}</pre>
            <div class="result-actions">
              <el-button type="primary" plain @click="goMetadata">
                <Icon icon="ep:grid" class="mr-5px" />
                结果列表
              </el-button>
              <el-button plain @click="goTaskLog">
                <Icon icon="ep:histogram" class="mr-5px" />
                任务日志
              </el-button>
              <el-button plain @click="goToolLog">
                <Icon icon="ep:tickets" class="mr-5px" />
                Tool 日志
              </el-button>
            </div>
          </template>
        </ContentWrap>

        <ContentWrap class="mt-12px governance-table-panel">
          <template #header>最近结构化结果</template>
          <el-table :data="results" stripe class="governance-dense-table">
            <el-table-column label="成功" width="90">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="dry-run" prop="dryRun" width="90" />
            <el-table-column label="消息" prop="message" min-width="240" show-overflow-tooltip />
            <el-table-column label="操作" width="120">
              <template #default>
                <el-button link type="primary" @click="goMetadata">结果列表</el-button>
              </template>
            </el-table-column>
          </el-table>
        </ContentWrap>

        <ContentWrap class="mt-12px governance-table-panel">
          <template #header>任务日志与 Tool 调用</template>
          <el-tabs v-model="logTab">
            <el-tab-pane label="任务日志" name="task">
              <el-table :data="taskLogs" stripe class="governance-dense-table">
                <el-table-column label="状态" prop="status" width="120" />
                <el-table-column label="消息" prop="message" min-width="240" show-overflow-tooltip />
                <el-table-column label="创建时间" prop="createTime" width="180" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="Tool 调用" name="tool">
              <el-table :data="toolLogs" stripe class="governance-dense-table">
                <el-table-column label="Tool" prop="toolName" min-width="180" show-overflow-tooltip />
                <el-table-column label="成功" width="90">
                  <template #default="{ row }">
                    <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '是' : '否' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="dry-run" prop="dryRun" width="90" />
                <el-table-column label="消息" prop="message" min-width="220" show-overflow-tooltip />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi, GovernanceRuleVO } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceMetadataFill' })

const router = useRouter()
const message = useMessage()
const rules = ref<GovernanceRuleVO[]>([])
const currentRule = ref<GovernanceRuleVO>()
const result = ref<any>()
const results = ref<any[]>([])
const taskLogs = ref<any[]>([])
const toolLogs = ref<any[]>([])
const logTab = ref('task')
const form = reactive<any>({ taskId: 1, dryRun: true, esId: '', toolName: '', payloadText: '{}' })

const kpiCards = computed(() => [
  { label: '治理规则', value: rules.value.length, delta: '可选择' },
  { label: '当前任务', value: form.taskId || '-', delta: form.dryRun ? 'dry-run' : '正式执行' },
  { label: '执行结果', value: result.value ? (result.value.success ? '成功' : '失败') : '待执行', delta: result.value?.message || '-' },
  { label: '结构化结果', value: results.value.length, delta: '最近' },
  { label: '任务日志', value: taskLogs.value.length, delta: '可追溯' },
  { label: 'Tool 调用', value: toolLogs.value.length, delta: form.toolName || '-' }
])

const loadRules = async () => {
  rules.value = await GovernanceApi.listRules()
}
const onRuleChange = () => {
  currentRule.value = rules.value.find((item) => item.id === form.ruleId)
  form.toolName = currentRule.value?.allowedTools?.[0] || ''
}
const execute = async () => {
  const payload = parsePayload(form.payloadText)
  result.value = await GovernanceApi.testTask({ ...form, payload: { ...payload, esId: form.esId || payload.esId } })
  await loadTrace()
}
const parsePayload = (text?: string) => {
  if (!text?.trim()) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    message.error('Payload 不是合法 JSON')
    throw error
  }
}
const loadTrace = async () => {
  const [resultList, taskLogList, toolLogList] = await Promise.all([
    GovernanceApi.listTaskResults(form.taskId),
    GovernanceApi.listTaskLogs(form.taskId),
    GovernanceApi.listToolLogs(form.taskId)
  ])
  results.value = resultList || []
  taskLogs.value = taskLogList || []
  toolLogs.value = toolLogList || []
}
const goMetadata = () => {
  router.push('/rag/metadata')
}
const goTaskLog = () => {
  router.push({ path: '/rag/apps/ai-task-log', query: { taskId: form.taskId || undefined, esId: form.esId || undefined } })
}
const goToolLog = () => {
  router.push('/rag/governance/tool-log')
}

onMounted(loadRules)
</script>

<style scoped>
.fill-page { display: flex; flex-direction: column; gap: 12px; }
.fill-kpi-grid { margin-bottom: 0; }
.result-json { margin-top: 14px; padding: 12px; background: #f8fafc; border: 1px solid #e6ebf2; border-radius: 6px; white-space: pre-wrap; }
.result-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
</style>
