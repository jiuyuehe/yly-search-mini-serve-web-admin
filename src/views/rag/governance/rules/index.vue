<template>
  <div class="gov-workbench">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / AI 数据智能治理 / <span>AI 治理规则管理</span></div>
          <div class="page-title">AI 治理规则管理</div>
        </div>
        <el-button type="primary" @click="openDrawer()">
          <Icon icon="ep:plus" class="mr-5px" />
          新增规则
        </el-button>
      </div>
    </ContentWrap>

    <ContentWrap>
      <el-table :data="rules" stripe class="dense-table">
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="规则名称" prop="name" min-width="180" show-overflow-tooltip />
        <el-table-column label="允许 Tool" min-width="280">
          <template #default="{ row }">
            <el-tag v-for="tool in row.allowedTools || []" :key="tool" class="mr-4px mb-4px" size="small">
              {{ tool }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="删除授权" width="110">
          <template #default="{ row }">
            <el-tag :type="row.allowDelete ? 'danger' : 'info'">{{ row.allowDelete ? '允许' : '禁止' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Dry-run" width="110">
          <template #default="{ row }">
            <el-tag :type="row.dryRunDefault ? 'success' : 'warning'">{{ row.dryRunDefault ? '默认' : '关闭' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDrawer(row)">编辑</el-button>
            <el-button link type="success" @click="openTest(row)">测试执行</el-button>
          </template>
        </el-table-column>
      </el-table>
    </ContentWrap>

    <el-drawer v-model="drawerVisible" :title="form.id ? '编辑治理规则' : '新增治理规则'" size="520px">
      <el-form label-width="96px">
        <el-form-item label="规则名称">
          <el-input v-model="form.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="提示词">
          <el-input v-model="form.prompt" type="textarea" :rows="8" placeholder="请输入治理规则提示词" />
        </el-form-item>
        <el-form-item label="允许 Tool">
          <el-select v-model="form.allowedTools" multiple filterable allow-create class="!w-full">
            <el-option v-for="tool in toolOptions" :key="tool" :label="tool" :value="tool" />
          </el-select>
        </el-form-item>
        <el-form-item label="删除类 Tool">
          <el-switch v-model="form.allowDelete" active-text="允许" inactive-text="禁止" />
        </el-form-item>
        <el-form-item label="默认 dry-run">
          <el-switch v-model="form.dryRunDefault" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="testVisible" title="规则测试执行" size="600px">
      <el-form label-width="92px">
        <el-form-item label="任务 ID">
          <el-input-number v-model="testForm.taskId" class="!w-full" :min="1" />
        </el-form-item>
        <el-form-item label="ESID">
          <el-input v-model="testForm.esId" placeholder="请输入测试文档 esId" />
        </el-form-item>
        <el-form-item label="Tool">
          <el-select v-model="testForm.toolName" class="!w-full">
            <el-option v-for="tool in currentRule?.allowedTools || []" :key="tool" :label="tool" :value="tool" />
          </el-select>
        </el-form-item>
        <el-form-item label="Payload">
          <el-input
            v-model="testForm.payloadText"
            type="textarea"
            :rows="7"
            placeholder='{"modelId": 1, "options": {"chunkSeconds": 5}}'
          />
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="runTest">执行 dry-run</el-button>
      <pre v-if="testResult" class="result-json">{{ JSON.stringify(testResult, null, 2) }}</pre>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi, GovernanceRuleVO } from '@/api/rag/governance'

defineOptions({ name: 'RagGovernanceRules' })

const message = useMessage()
const rules = ref<GovernanceRuleVO[]>([])
const drawerVisible = ref(false)
const testVisible = ref(false)
const currentRule = ref<GovernanceRuleVO>()
const testResult = ref<any>()
const form = reactive<GovernanceRuleVO>({
  name: '',
  prompt: '',
  allowedTools: [],
  allowDelete: false,
  dryRunDefault: true,
  enabled: true
})
const testForm = reactive<any>({ taskId: 1, esId: '', toolName: '', payloadText: '{}' })
const toolOptions = [
  'taxonomy.bindTheme',
  'taxonomy.bindLevelTag',
  'metadata.fillResult',
  'graph.generateNerGraph',
  'audio.startAudioAsr',
  'audio.summarizeAudioTranscript'
]

const loadRules = async () => {
  rules.value = await GovernanceApi.listRules()
}

const openDrawer = (row?: GovernanceRuleVO) => {
  Object.assign(form, row || { id: undefined, name: '', prompt: '', allowedTools: [], allowDelete: false, dryRunDefault: true, enabled: true })
  drawerVisible.value = true
}

const saveRule = async () => {
  await GovernanceApi.saveRule(form)
  message.success('规则已保存')
  drawerVisible.value = false
  await loadRules()
}

const openTest = (row: GovernanceRuleVO) => {
  currentRule.value = row
  testForm.ruleId = row.id
  testForm.toolName = row.allowedTools?.[0] || ''
  testForm.payloadText = '{}'
  testVisible.value = true
}

const runTest = async () => {
  const payload = parsePayload(testForm.payloadText)
  testResult.value = await GovernanceApi.testTask({ ...testForm, dryRun: true, payload: { ...payload, esId: testForm.esId || payload.esId } })
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

onMounted(loadRules)
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
.result-json { margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e6ebf2; border-radius: 6px; white-space: pre-wrap; }
</style>
