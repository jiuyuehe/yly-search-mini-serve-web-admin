<template>
  <Dialog v-model="dialogVisible" :title="title" width="820px">
    <el-form ref="formRef" :model="formData" label-width="120px" v-loading="formLoading">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="作用域">
            <el-input :value="scopeLabel" disabled />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="模型类型">
            <el-input :value="modelTypeLabel" disabled />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="配置名称">
        <el-input v-model="formData.configName" placeholder="留空时按作用域自动生成" />
      </el-form-item>

      <el-form-item label="模型">
        <el-select
          v-model="formData.modelId"
          clearable
          filterable
          placeholder="请选择模型"
          style="width: 100%"
        >
          <el-option
            v-for="item in modelOptions"
            :key="item.id"
            :label="buildModelLabel(item)"
            :value="item.id"
          />
        </el-select>
        <div class="form-hint">当前展示全部已启用模型，不再按模型类型限制选择。</div>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="调用方式">
            <el-select v-model="formData.invokeMode" placeholder="请选择调用方式" style="width: 100%">
              <el-option
                v-for="item in invokeModeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-switch
              v-model="enabled"
              inline-prompt
              active-text="启用"
              inactive-text="停用"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item v-if="showEndpointConfig" label="访问地址">
        <el-input
          v-model="formData.endpointUrl"
          placeholder="例如：http://127.0.0.1:5000/ocr；纯模型直连可留空"
        />
      </el-form-item>

      <el-form-item v-if="showEndpointConfig" label="API Key">
        <el-input
          v-model="formData.apiKey"
          type="textarea"
          :rows="2"
          placeholder="可选；需要鉴权时填写"
        />
      </el-form-item>

      <el-form-item v-if="showJsonTemplateConfig" label="Headers JSON">
        <el-input
          v-model="formData.headersJson"
          type="textarea"
          :rows="3"
          placeholder='例如：{"Authorization":"Bearer xxx"}'
        />
      </el-form-item>

      <el-form-item v-if="showJsonTemplateConfig" label="请求模板 JSON">
        <el-input
          v-model="formData.requestTemplateJson"
          type="textarea"
          :rows="5"
          placeholder='例如：{"model":"xxx","input":"${text}"}'
        />
      </el-form-item>

      <el-form-item v-if="showJsonTemplateConfig" label="响应映射 JSON">
        <el-input
          v-model="formData.responseMappingJson"
          type="textarea"
          :rows="4"
          placeholder='例如：{"text":"$.data.text"}'
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="超时(毫秒)">
            <el-input-number
              v-model="formData.timeoutMs"
              :min="1000"
              :max="600000"
              :step="1000"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="备注">
            <el-input v-model="formData.remark" placeholder="选填" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="handleTest" :loading="testLoading">连通性测试</el-button>
      <el-button type="primary" @click="submitForm" :loading="formLoading">保 存</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {
  DefaultModelConfigItemVO,
  DefaultModelConfigSaveReqVO,
  DefaultModelConfigTestReqVO,
  ModelCandidateVO,
  RagAppsApi
} from '@/api/rag/apps'
import { useMessage } from '@/hooks/web/useMessage'
import { computed, reactive, ref } from 'vue'

defineOptions({ name: 'DefaultModelConfigForm' })

interface OpenPayload {
  title: string
  record: DefaultModelConfigItemVO
  modelOptions: ModelCandidateVO[]
  saveApi: (data: DefaultModelConfigSaveReqVO) => Promise<boolean>
}

const emit = defineEmits(['success'])
const message = useMessage()

const dialogVisible = ref(false)
const title = ref('')
const formLoading = ref(false)
const testLoading = ref(false)
const formRef = ref()
const modelOptions = ref<ModelCandidateVO[]>([])
const saveApiRef = ref<OpenPayload['saveApi']>()

const invokeModeOptions = [
  { label: 'AI 模型直连', value: 'AI_MODEL' },
  { label: 'HTTP JSON', value: 'HTTP_JSON' },
  { label: 'OpenAI TTS', value: 'OPENAI_AUDIO_SPEECH' },
  { label: 'OpenAI ASR', value: 'OPENAI_AUDIO_TRANSCRIPTION' }
]

const formData = reactive<DefaultModelConfigSaveReqVO>({
  scopeType: 'MODEL_TYPE',
  scopeCode: '',
  modelType: 1,
  modelId: undefined,
  configName: '',
  endpointUrl: '',
  invokeMode: 'AI_MODEL',
  apiKey: '',
  headersJson: '{}',
  requestTemplateJson: '{}',
  responseMappingJson: '{}',
  timeoutMs: 60000,
  status: 0,
  remark: ''
})

const showEndpointConfig = computed(() => formData.invokeMode !== 'AI_MODEL')
const showJsonTemplateConfig = computed(() => formData.invokeMode === 'HTTP_JSON')

const scopeLabel = computed(() => {
  if (formData.scopeType === 'TASK_TYPE') {
    return `任务覆盖 / ${formData.scopeCode}`
  }
  return `模型类型默认 / ${formData.scopeCode}`
})

const modelTypeLabel = computed(() => `${formData.modelType ?? '-'} / ${formData.scopeCode}`)

const enabled = computed({
  get: () => formData.status === 0,
  set: (value: boolean) => {
    formData.status = value ? 0 : 1
  }
})

const resetForm = () => {
  Object.assign(formData, {
    id: undefined,
    scopeType: 'MODEL_TYPE',
    scopeCode: '',
    modelType: 1,
    modelId: undefined,
    configName: '',
    endpointUrl: '',
    invokeMode: 'AI_MODEL',
    apiKey: '',
    headersJson: '{}',
    requestTemplateJson: '{}',
    responseMappingJson: '{}',
    timeoutMs: 60000,
    status: 0,
    remark: ''
  })
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const buildModelLabel = (item: ModelCandidateVO) => {
  const parts = [item.name]
  if (item.model) {
    parts.push(item.model)
  }
  if (item.platform) {
    parts.push(item.platform)
  }
  return parts.join(' / ')
}

const open = (payload: OpenPayload) => {
  resetForm()
  title.value = payload.title
  dialogVisible.value = true
  modelOptions.value = payload.modelOptions
  saveApiRef.value = payload.saveApi
  Object.assign(formData, {
    ...payload.record,
    endpointUrl: payload.record.endpointUrl || '',
    invokeMode: payload.record.invokeMode || 'AI_MODEL',
    apiKey: payload.record.apiKey || '',
    headersJson: payload.record.headersJson || '{}',
    requestTemplateJson: payload.record.requestTemplateJson || '{}',
    responseMappingJson: payload.record.responseMappingJson || '{}',
    timeoutMs: payload.record.timeoutMs || 60000,
    status: payload.record.status ?? 0,
    remark: payload.record.remark || '',
    configName:
      payload.record.configName ||
      `${payload.record.scopeType === 'TASK_TYPE' ? '任务覆盖' : '类型默认'}-${payload.record.scopeCode}`
  })
}

const validateJsonField = (value: string | undefined, label: string) => {
  if (!value) {
    return true
  }
  try {
    JSON.parse(value)
    return true
  } catch (error) {
    message.error(`${label} 不是合法 JSON`)
    return false
  }
}

const validateForm = () => {
  if (!formData.scopeType || !formData.scopeCode) {
    message.error('作用域信息缺失，无法保存')
    return false
  }
  if (!formData.invokeMode) {
    message.error('请选择调用方式')
    return false
  }
  if (formData.invokeMode === 'AI_MODEL' && (!formData.modelId || formData.modelId <= 0)) {
    message.error('AI_MODEL 模式必须选择模型')
    return false
  }
  if (showEndpointConfig.value && !formData.endpointUrl) {
    message.error('当前调用方式必须填写访问地址')
    return false
  }
  if (showJsonTemplateConfig.value && !validateJsonField(formData.headersJson, 'Headers JSON')) {
    return false
  }
  if (showJsonTemplateConfig.value && !validateJsonField(formData.requestTemplateJson, '请求模板 JSON')) {
    return false
  }
  if (showJsonTemplateConfig.value && !validateJsonField(formData.responseMappingJson, '响应映射 JSON')) {
    return false
  }
  return true
}

const handleTest = async () => {
  if (!validateForm()) {
    return
  }
  testLoading.value = true
  try {
    const payload: DefaultModelConfigTestReqVO = {
      modelId: formData.modelId,
      endpointUrl: formData.endpointUrl,
      invokeMode: formData.invokeMode,
      apiKey: formData.apiKey
    }
    const res = await RagAppsApi.testConfig(payload)
    const tone = res.success ? 'success' : 'warning'
    message[tone](`${res.message}（HTTP ${res.statusCode}）`)
  } catch (error) {
    console.error('测试默认模型配置失败:', error)
    message.error('连通性测试失败')
  } finally {
    testLoading.value = false
  }
}

const submitForm = async () => {
  if (!validateForm()) {
    return
  }
  if (!saveApiRef.value) {
    message.error('保存方法未初始化')
    return
  }
  formLoading.value = true
  try {
    await saveApiRef.value({ ...formData })
    message.success('保存成功')
    dialogVisible.value = false
    emit('success')
  } catch (error) {
    console.error('保存默认模型配置失败:', error)
    message.error('保存失败')
  } finally {
    formLoading.value = false
  }
}

defineExpose({ open })
</script>

<style lang="scss" scoped>
.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
