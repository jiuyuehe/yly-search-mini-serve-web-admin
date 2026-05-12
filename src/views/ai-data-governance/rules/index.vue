<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / AI 数据治理 / <span>治理规则管理</span></div>
          <div class="page-title">治理规则与 Agent 约束</div>
          <div class="page-subtitle">定义数据范围、写入目标、结构化输出，以及可调用 Tool/MCP 白名单。</div>
        </div>
        <div class="head-actions">
          <el-button @click="loadData"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
          <el-button type="primary" @click="openRule()"><Icon icon="ep:plus" class="mr-5px" />新增规则</el-button>
        </div>
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
      <template #header>规则清单</template>
      <el-table :data="rules" stripe>
        <el-table-column label="规则名称" prop="name" min-width="180" show-overflow-tooltip />
        <el-table-column label="适用数据范围" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">{{ scopeText(row.dataScope) }}</template>
        </el-table-column>
        <el-table-column label="写入目标模型" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.targetModelName || modelName(row.targetModelId) || '-' }}</template>
        </el-table-column>
        <el-table-column label="结构输出" width="110">
          <template #default="{ row }">
            <el-tag :type="row.outputSchema ? 'success' : 'info'">
              {{ row.outputSchema ? '已配置' : '未配置' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Tool 白名单" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ (row.allowedTools || []).join('、') || '未限制' }}</template>
        </el-table-column>
        <el-table-column label="MCP 白名单" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ (row.allowedMcps || []).join('、') || '未配置' }}</template>
        </el-table-column>
        <el-table-column label="默认 dry-run" width="120">
          <template #default="{ row }">
            <el-tag :type="row.dryRunDefault ? 'warning' : 'success'">{{ row.dryRunDefault ? '开启' : '关闭' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openRule(row)">编辑</el-button>
            <el-button link type="primary" @click="openDryRun(row)">dry-run</el-button>
            <el-button link type="primary" @click="duplicateRule(row)">复制</el-button>
          </template>
        </el-table-column>
      </el-table>
    </ContentWrap>

    <el-drawer v-model="drawerVisible" :title="form.id ? '编辑治理规则' : '新增治理规则'" size="720px">
      <el-form label-width="120px" :model="form">
        <el-form-item label="规则名称">
          <el-input v-model="form.name" placeholder="例如：NER 结果写入人物画像" />
        </el-form-item>
        <el-form-item label="治理提示词">
          <el-input v-model="form.prompt" type="textarea" :rows="5" placeholder="描述 Agent 应如何判断、抽取、调用工具和写入结果" />
        </el-form-item>
        <el-divider content-position="left">适用数据范围</el-divider>
        <el-form-item label="来源类型">
          <el-select v-model="scopeForm.sourceTypes" multiple clearable placeholder="全部来源" class="w-100%">
            <el-option label="文件" value="file" />
            <el-option label="网页" value="web" />
            <el-option label="邮件" value="mail" />
            <el-option label="音视频" value="audio_video" />
          </el-select>
        </el-form-item>
        <el-form-item label="格式分组">
          <el-select v-model="scopeForm.formatGroups" multiple clearable placeholder="全部格式" class="w-100%">
            <el-option label="文档" value="document" />
            <el-option label="表格" value="sheet" />
            <el-option label="图片/OCR" value="image" />
            <el-option label="音视频" value="media" />
          </el-select>
        </el-form-item>
        <el-form-item label="主题/文件">
          <div class="scope-row">
            <el-input v-model="scopeForm.themeId" placeholder="主题 ID，可为空" />
            <el-input v-model="scopeForm.esId" placeholder="指定 ESID，可为空" />
          </div>
        </el-form-item>
        <el-divider content-position="left">输出与写入</el-divider>
        <el-form-item label="目标模型">
          <el-select v-model="form.targetModelId" clearable filterable placeholder="选择元数据模型" class="w-100%" @change="syncTargetModelName">
            <el-option v-for="item in modelCards" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="输出结构 JSON">
          <el-input v-model="outputSchemaText" type="textarea" :rows="7" placeholder='{"fields":{"name":"string"},"required":["name"]}' />
        </el-form-item>
        <el-divider content-position="left">可调用能力</el-divider>
        <el-form-item label="Tool 白名单">
          <el-select v-model="form.allowedTools" multiple filterable clearable placeholder="未选择时不限制" class="w-100%">
            <el-option
              v-for="item in toolCatalog"
              :key="item.canonicalName"
              :label="`${item.module} / ${item.name}`"
              :value="item.canonicalName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="MCP 白名单">
          <el-select v-model="form.allowedMcps" multiple filterable clearable placeholder="选择可发布/可调用 MCP" class="w-100%">
            <el-option
              v-for="item in mcpCatalog"
              :key="item.canonicalName"
              :label="`${item.module} / ${item.name}`"
              :value="item.canonicalName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="执行保护">
          <el-checkbox v-model="form.allowDelete">允许删除类 Tool</el-checkbox>
          <el-checkbox v-model="form.dryRunDefault">默认 dry-run</el-checkbox>
          <el-checkbox v-model="form.enabled">启用规则</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存规则</el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="dryRunVisible" title="规则 dry-run" width="640px">
      <el-form label-width="90px">
        <el-form-item label="规则">
          <el-input :model-value="dryRunRule?.name" disabled />
        </el-form-item>
        <el-form-item label="工具">
          <el-select v-model="dryRunReq.toolName" filterable class="w-100%">
            <el-option
              v-for="item in toolCatalog"
              :key="item.canonicalName"
              :label="`${item.module} / ${item.name}`"
              :value="item.canonicalName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="ESID">
          <el-input v-model="dryRunReq.esId" placeholder="可选，指定测试文件" />
        </el-form-item>
        <el-form-item label="Payload">
          <el-input v-model="dryRunPayloadText" type="textarea" :rows="6" />
        </el-form-item>
      </el-form>
      <pre v-if="dryRunResult" class="json-box">{{ dryRunResult }}</pre>
      <template #footer>
        <el-button @click="dryRunVisible = false">关闭</el-button>
        <el-button type="primary" @click="runDryRun">执行 dry-run</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { GovernanceApi, GovernanceRuleVO, GovernanceToolCatalogVO } from '@/api/rag/governance'
import { MetadataApi, MetadataMcpPublishVO, MetadataModelCardVO } from '@/api/rag/metadata'

defineOptions({ name: 'AiDataGovernanceRules' })

const loading = ref(false)
const drawerVisible = ref(false)
const dryRunVisible = ref(false)
const rules = ref<GovernanceRuleVO[]>([])
const modelCards = ref<MetadataModelCardVO[]>([])
const toolCatalog = ref<GovernanceToolCatalogVO[]>([])
const mcpCatalog = ref<MetadataMcpPublishVO[]>([])
const outputSchemaText = ref('')
const dryRunPayloadText = ref('{}')
const dryRunResult = ref('')
const dryRunRule = ref<GovernanceRuleVO>()
const scopeForm = reactive({
  sourceTypes: [] as string[],
  formatGroups: [] as string[],
  themeId: '',
  esId: ''
})
const form = reactive<GovernanceRuleVO>({
  name: '',
  prompt: '',
  allowedTools: [],
  allowedMcps: [],
  allowDelete: false,
  dryRunDefault: true,
  enabled: true
})
const dryRunReq = reactive({
  toolName: '',
  esId: ''
})

const kpis = computed(() => [
  { label: '治理规则', value: rules.value.length, delta: '规则库' },
  { label: '启用规则', value: rules.value.filter((item) => item.enabled).length, delta: '可调度' },
  { label: '绑定目标模型', value: rules.value.filter((item) => item.targetModelId).length, delta: '写入目标' },
  { label: '结构输出', value: rules.value.filter((item) => item.outputSchema).length, delta: 'Schema' },
  { label: 'Tool 能力', value: toolCatalog.value.length, delta: '系统工具' },
  { label: 'MCP 能力', value: mcpCatalog.value.length, delta: '发布目录' }
])

const loadData = async () => {
  loading.value = true
  try {
    const [ruleList, models, tools, mcps] = await Promise.all([
      GovernanceApi.listRules(),
      MetadataApi.getModelCards({ status: 1 }),
      GovernanceApi.listToolCatalog(),
      MetadataApi.getMcpPublishCatalog()
    ])
    rules.value = ruleList || []
    modelCards.value = models || []
    toolCatalog.value = tools || []
    mcpCatalog.value = mcps || []
  } finally {
    loading.value = false
  }
}

const openRule = (row?: GovernanceRuleVO) => {
  Object.assign(form, {
    id: row?.id,
    name: row?.name || '',
    prompt: row?.prompt || '',
    dataScope: row?.dataScope || {},
    targetModelId: row?.targetModelId,
    targetModelName: row?.targetModelName || modelName(row?.targetModelId),
    outputSchema: row?.outputSchema,
    allowedTools: [...(row?.allowedTools || [])],
    allowedMcps: [...(row?.allowedMcps || [])],
    allowDelete: !!row?.allowDelete,
    dryRunDefault: row?.dryRunDefault !== false,
    enabled: row?.enabled !== false
  })
  const scope = row?.dataScope || {}
  scopeForm.sourceTypes = [...(scope.sourceTypes || [])]
  scopeForm.formatGroups = [...(scope.formatGroups || [])]
  scopeForm.themeId = scope.themeId || ''
  scopeForm.esId = scope.esId || ''
  outputSchemaText.value = formatJson(row?.outputSchema)
  drawerVisible.value = true
}

const duplicateRule = (row: GovernanceRuleVO) => {
  openRule({ ...row, id: undefined, name: `${row.name || '治理规则'} 副本` })
}

const saveRule = async () => {
  if (!form.name) {
    ElMessage.warning('请填写规则名称')
    return
  }
  const outputSchema = parseJson(outputSchemaText.value, '输出结构 JSON')
  if (outputSchema === null) return
  const dataScope = {
    sourceTypes: scopeForm.sourceTypes,
    formatGroups: scopeForm.formatGroups,
    themeId: scopeForm.themeId,
    esId: scopeForm.esId
  }
  syncTargetModelName()
  await GovernanceApi.saveRule({ ...form, dataScope, outputSchema })
  ElMessage.success('治理规则已保存')
  drawerVisible.value = false
  await loadData()
}

const openDryRun = (row: GovernanceRuleVO) => {
  dryRunRule.value = row
  dryRunReq.toolName = row.allowedTools?.[0] || toolCatalog.value[0]?.canonicalName || ''
  dryRunReq.esId = row.dataScope?.esId || ''
  dryRunPayloadText.value = formatJson({ fields: {}, reason: 'dry-run' })
  dryRunResult.value = ''
  dryRunVisible.value = true
}

const runDryRun = async () => {
  if (!dryRunRule.value?.id || !dryRunReq.toolName) {
    ElMessage.warning('请选择规则和工具')
    return
  }
  const payload = parseJson(dryRunPayloadText.value, 'Payload')
  if (payload === null) return
  const result = await GovernanceApi.testTask({
    ruleId: dryRunRule.value.id,
    toolName: dryRunReq.toolName,
    esId: dryRunReq.esId,
    payload,
    dryRun: true
  })
  dryRunResult.value = formatJson(result)
}

const syncTargetModelName = () => {
  form.targetModelName = modelName(form.targetModelId)
}

const modelName = (id?: number) => modelCards.value.find((item) => item.id === id)?.name || ''

const scopeText = (scope?: Record<string, any>) => {
  if (!scope) return '全部数据'
  const parts = [
    (scope.sourceTypes || []).join('/'),
    (scope.formatGroups || []).join('/'),
    scope.themeId ? `主题 ${scope.themeId}` : '',
    scope.esId ? `ESID ${scope.esId}` : ''
  ].filter(Boolean)
  return parts.join(' · ') || '全部数据'
}

const parseJson = (value: string, label: string) => {
  if (!value?.trim()) return undefined
  try {
    return JSON.parse(value)
  } catch (error) {
    ElMessage.error(`${label} 格式不正确`)
    return null
  }
}

const formatJson = (value: any) => value ? JSON.stringify(value, null, 2) : ''

onMounted(loadData)
</script>

<style scoped>
.governance-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 800; color: #101828; }
.page-subtitle { margin-top: 6px; color: #667085; }
.head-actions { display: flex; gap: 8px; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 10px; font-size: 24px; font-weight: 800; color: #101828; }
.kpi-delta { margin-top: 8px; color: #12a666; }
.scope-row { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.json-box { max-height: 260px; overflow: auto; padding: 12px; background: #101828; color: #d1fadf; border-radius: 6px; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid, .scope-row { grid-template-columns: 1fr; } }
</style>
