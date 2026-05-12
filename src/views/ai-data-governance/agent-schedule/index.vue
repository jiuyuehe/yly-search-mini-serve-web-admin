<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / AI 数据治理 / <span>AI 治理任务定时管理</span></div>
          <div class="page-title">Agent 式治理任务编排</div>
          <div class="page-subtitle">把治理规则、数据范围、Tool 白名单和目标模型交给大模型任务执行，支持 dry-run 与审阅后写入。</div>
        </div>
        <el-button type="primary" @click="loadData"><Icon icon="ep:refresh" class="mr-5px" />刷新任务</el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid" v-loading="loading">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">{{ item.delta }}</div>
      </div>
    </div>

    <div class="panel-grid">
      <ContentWrap>
        <template #header>创建 / 执行治理任务</template>
        <el-form label-width="100px">
          <el-form-item label="治理规则">
            <el-select v-model="taskForm.ruleId" filterable placeholder="选择规则" class="w-100%" @change="syncRule">
              <el-option v-for="item in enabledRules" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="任务名称">
            <el-input v-model="taskForm.name" placeholder="例如：邮件分析结构化写入" />
          </el-form-item>
          <el-form-item label="ESID">
            <el-input v-model="taskForm.esId" placeholder="指定数据源，可为空" />
          </el-form-item>
          <el-form-item label="Agent Tool">
            <el-select v-model="execution.toolName" filterable placeholder="选择规则允许的工具" class="w-100%">
              <el-option
                v-for="item in availableTools"
                :key="item.canonicalName"
                :label="`${item.module} / ${item.name}`"
                :value="item.canonicalName"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Payload">
            <el-input v-model="payloadText" type="textarea" :rows="8" />
          </el-form-item>
          <el-form-item label="Cron">
            <el-input v-model="taskForm.cronExpression" placeholder="可选，填写后自动注册 infra Quartz 定时任务" />
          </el-form-item>
          <el-form-item label="执行模式">
            <el-checkbox v-model="execution.dryRun">dry-run，仅校验不写入</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button @click="createOnly">创建任务</el-button>
            <el-button type="warning" @click="runAgent(true)">dry-run</el-button>
            <el-button type="primary" @click="runAgent(false)">正式执行</el-button>
          </el-form-item>
        </el-form>
        <div v-if="executionResult" class="result-box">
          <div class="result-title">执行结果</div>
          <pre>{{ executionResult }}</pre>
        </div>
      </ContentWrap>

      <ContentWrap>
        <template #header>规则上下文</template>
        <div class="rule-context" v-if="currentRule">
          <div class="context-line"><span>目标模型</span><b>{{ currentRule.targetModelName || '-' }}</b></div>
          <div class="context-line"><span>数据范围</span><b>{{ scopeText(currentRule.dataScope) }}</b></div>
          <div class="context-line"><span>允许删除</span><b>{{ currentRule.allowDelete ? '是' : '否' }}</b></div>
          <div class="context-block">
            <span>Tool 白名单</span>
            <el-tag v-for="item in currentRule.allowedTools || []" :key="item" class="mr-6px mt-6px">{{ item }}</el-tag>
          </div>
          <div class="context-block">
            <span>MCP 白名单</span>
            <el-tag v-for="item in currentRule.allowedMcps || []" :key="item" type="success" class="mr-6px mt-6px">{{ item }}</el-tag>
          </div>
          <div class="context-block">
            <span>结构化输出</span>
            <pre>{{ formatJson(currentRule.outputSchema) || '-' }}</pre>
          </div>
        </div>
        <el-empty v-else description="请选择治理规则" />
      </ContentWrap>
    </div>

    <div class="panel-grid">
      <ContentWrap>
        <template #header>治理任务队列</template>
        <el-table :data="tasks" stripe height="360" @row-click="selectTask">
          <el-table-column label="任务" prop="name" min-width="180" show-overflow-tooltip />
          <el-table-column label="规则" prop="ruleId" width="90" />
          <el-table-column label="调度" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">{{ row.cronExpression || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" prop="status" width="120">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="ESID" prop="esId" min-width="170" show-overflow-tooltip />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button link type="primary" :disabled="!row.infraJobId" @click.stop="triggerScheduledTask(row)">触发</el-button>
            </template>
          </el-table-column>
        </el-table>
      </ContentWrap>

      <ContentWrap>
        <template #header>结构化结果审阅</template>
        <el-table :data="results" stripe height="360">
          <el-table-column label="结果" min-width="260">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag>
              <el-tag :type="row.dryRun ? 'warning' : 'success'" class="ml-6px">{{ row.dryRun ? 'dry-run' : '已执行' }}</el-tag>
              <div class="message">{{ row.message }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button link type="primary" @click="previewResult(row)">查看</el-button>
              <el-button link type="primary" :disabled="!canWriteResult(row)" @click="writeReviewedResult(row)">审阅写入</el-button>
            </template>
          </el-table-column>
        </el-table>
      </ContentWrap>
    </div>

    <ContentWrap>
      <template #header>Agent Tool 调用日志</template>
      <el-table :data="toolLogs" stripe>
        <el-table-column label="任务ID" prop="taskId" width="90" />
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
    </ContentWrap>

    <el-dialog v-model="previewVisible" title="结构化结果" width="720px">
      <pre class="json-box">{{ previewText }}</pre>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  GovernanceApi,
  GovernanceRuleVO,
  GovernanceTaskVO,
  GovernanceToolCatalogVO
} from '@/api/rag/governance'

defineOptions({ name: 'AiDataGovernanceAgentSchedule' })

const loading = ref(false)
const previewVisible = ref(false)
const previewText = ref('')
const executionResult = ref('')
const rules = ref<GovernanceRuleVO[]>([])
const tasks = ref<GovernanceTaskVO[]>([])
const results = ref<any[]>([])
const toolLogs = ref<any[]>([])
const toolCatalog = ref<GovernanceToolCatalogVO[]>([])
const payloadText = ref('{\n  "fields": {},\n  "reason": "agent-governance"\n}')
const taskForm = reactive<GovernanceTaskVO>({
  ruleId: undefined,
  name: '',
  esId: '',
  toolName: '',
  dryRun: true,
  cronExpression: '',
  payload: {}
})
const execution = reactive({
  taskId: undefined as number | undefined,
  toolName: '',
  dryRun: true
})

const enabledRules = computed(() => rules.value.filter((item) => item.enabled !== false))
const currentRule = computed(() => rules.value.find((item) => item.id === taskForm.ruleId))
const availableTools = computed(() => {
  const allowed = currentRule.value?.allowedTools || []
  return allowed.length ? toolCatalog.value.filter((item) => allowed.includes(item.canonicalName)) : toolCatalog.value
})
const kpis = computed(() => [
  { label: '治理规则', value: enabledRules.value.length, delta: '可编排' },
  { label: '治理任务', value: tasks.value.length, delta: '任务队列' },
  { label: 'dry-run 结果', value: results.value.filter((item) => item.dryRun).length, delta: '审阅前校验' },
  { label: '正式结果', value: results.value.filter((item) => !item.dryRun).length, delta: '已执行' },
  { label: '失败结果', value: results.value.filter((item) => !item.success).length, delta: '需处理' },
  { label: 'Tool 日志', value: toolLogs.value.length, delta: '审计链路' }
])

const loadData = async () => {
  loading.value = true
  try {
    const [ruleList, taskList, resultList, logList, tools] = await Promise.all([
      GovernanceApi.listRules(),
      GovernanceApi.listTasks(),
    GovernanceApi.listTaskResults(),
      GovernanceApi.listToolLogs(),
      GovernanceApi.listToolCatalog()
    ])
    rules.value = ruleList || []
    tasks.value = taskList || []
    results.value = resultList || []
    toolLogs.value = logList || []
    toolCatalog.value = tools || []
    if (!taskForm.ruleId && enabledRules.value[0]?.id) {
      taskForm.ruleId = enabledRules.value[0].id
      syncRule()
    }
  } finally {
    loading.value = false
  }
}

const syncRule = () => {
  const rule = currentRule.value
  if (!rule) return
  taskForm.name = taskForm.name || `${rule.name || '治理规则'} 执行任务`
  taskForm.esId = taskForm.esId || rule.dataScope?.esId || ''
  execution.toolName = rule.allowedTools?.[0] || toolCatalog.value[0]?.canonicalName || ''
  execution.dryRun = rule.dryRunDefault !== false
}

const createOnly = async () => {
  const task = await createTask(dryRun)
  if (task?.id) {
    ElMessage.success('治理任务已创建')
    await loadData()
  }
}

const runAgent = async (dryRun: boolean) => {
  const task = await createTask()
  if (!task?.id) return
  const payload = parsePayload()
  if (!payload) return
  if (!execution.toolName) {
    ElMessage.warning('请选择 Agent Tool')
    return
  }
  const result = dryRun
    ? await GovernanceApi.testTask({
        ruleId: task.ruleId,
        taskId: task.id,
        esId: task.esId,
        toolName: execution.toolName,
        payload,
        dryRun: true
      })
    : await GovernanceApi.executeTask({
        ruleId: task.ruleId,
        taskId: task.id,
        esId: task.esId,
        toolName: execution.toolName,
        payload,
        dryRun: false
      })
  executionResult.value = formatJson(result)
  ElMessage.success(dryRun ? 'dry-run 已完成' : '正式执行已完成')
  await loadData()
}

const createTask = async (dryRunMode = execution.dryRun) => {
  if (!taskForm.ruleId) {
    ElMessage.warning('请选择治理规则')
    return undefined
  }
  const payload = parsePayload()
  if (!payload) return undefined
  const task = await GovernanceApi.createTask({
    ruleId: taskForm.ruleId,
    name: taskForm.name || `${currentRule.value?.name || '治理规则'} 执行任务`,
    esId: taskForm.esId,
    toolName: execution.toolName,
    dryRun: dryRunMode,
    cronExpression: taskForm.cronExpression,
    payload
  })
  execution.taskId = task.id
  return task
}

const selectTask = async (row: GovernanceTaskVO) => {
  taskForm.ruleId = row.ruleId
  taskForm.name = row.name || ''
  taskForm.esId = row.esId || ''
  taskForm.toolName = row.toolName || ''
  taskForm.dryRun = row.dryRun !== false
  taskForm.cronExpression = row.cronExpression || ''
  execution.taskId = row.id
  execution.toolName = row.toolName || execution.toolName
  execution.dryRun = row.dryRun !== false
  payloadText.value = formatJson(row.payload || {})
  if (row.id) {
    const [resultList, logList] = await Promise.all([
      GovernanceApi.listTaskResults(row.id),
      GovernanceApi.listToolLogs(row.id)
    ])
    results.value = resultList || []
    toolLogs.value = logList || []
  }
  syncRule()
}

const writeReviewedResult = async (row: any) => {
  const rule = currentRule.value
  if (!rule?.targetModelId) {
    ElMessage.warning('当前规则未配置写入目标模型')
    return
  }
  const payload = {
    modelId: rule.targetModelId,
    esId: taskForm.esId,
    fields: row.data?.fields || row.data || parsePayload()
  }
  const result = await GovernanceApi.executeTask({
    ruleId: rule.id,
    taskId: execution.taskId,
    esId: taskForm.esId,
    toolName: 'metadata.fillResult',
    payload,
    dryRun: false
  })
  previewText.value = formatJson(result)
  previewVisible.value = true
  ElMessage.success('审阅结果已提交写入')
  await loadData()
}

const previewResult = (row: any) => {
  previewText.value = formatJson(row)
  previewVisible.value = true
}

const canWriteResult = (row: any) => !!currentRule.value?.targetModelId && row?.success
const triggerScheduledTask = async (row: GovernanceTaskVO) => {
  if (!row.id) return
  await GovernanceApi.triggerTask(row.id)
  ElMessage.success('已触发治理任务调度')
}
const parsePayload = () => {
  try {
    return JSON.parse(payloadText.value || '{}')
  } catch (error) {
    ElMessage.error('Payload JSON 格式不正确')
    return undefined
  }
}
const scopeText = (scope?: Record<string, any>) => {
  if (!scope) return '全部数据'
  return [
    (scope.sourceTypes || []).join('/'),
    (scope.formatGroups || []).join('/'),
    scope.themeId ? `主题 ${scope.themeId}` : '',
    scope.esId ? `ESID ${scope.esId}` : ''
  ].filter(Boolean).join(' · ') || '全部数据'
}
const formatJson = (value: any) => value ? JSON.stringify(value, null, 2) : ''
const statusType = (status?: string) => {
  if (['SUCCESS', 'FINISHED', 'DONE', 'COMPLETED'].includes(status || '')) return 'success'
  if (['FAILED', 'ERROR', 'FAIL'].includes(status || '')) return 'danger'
  if (['RUNNING', 'PROCESSING', 'PENDING'].includes(status || '')) return 'warning'
  return 'info'
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
.panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rule-context { display: flex; flex-direction: column; gap: 12px; }
.context-line { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eef2f7; color: #667085; }
.context-line b { color: #101828; }
.context-block span { display: block; margin-bottom: 6px; color: #667085; }
.context-block pre, .result-box pre, .json-box { max-height: 260px; overflow: auto; padding: 12px; background: #101828; color: #d1fadf; border-radius: 6px; }
.result-box { margin-top: 10px; }
.result-title { margin-bottom: 6px; font-weight: 700; color: #101828; }
.message { margin-top: 6px; color: #667085; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .panel-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } }
</style>
