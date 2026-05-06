<template>
  <ContentWrap>
    <div class="page-head">
      <div>
        <div class="page-title">音视频智能转写</div>
      </div>
      <el-button @click="goTaskLog">
        <Icon icon="ep:document" class="mr-5px" />
        任务日志
      </el-button>
    </div>
  </ContentWrap>

  <el-row :gutter="16">
    <el-col :xs="24" :lg="8">
      <ContentWrap>
        <template #header>提交任务</template>
        <el-form ref="formRef" :model="formData" :rules="rules" label-width="108px">
          <el-form-item label="文档 ESID" prop="esId">
            <el-input v-model="formData.esId" clearable placeholder="请输入音频/视频文件 esId" />
          </el-form-item>
          <el-form-item label="ASR 模型">
            <el-select v-model="formData.modelId" class="!w-full" clearable filterable placeholder="默认优先 qwen3-asr">
              <el-option v-for="item in asrModels" :key="item.id" :label="modelLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="语言">
            <el-select v-model="formData.language" class="!w-full">
              <el-option v-for="item in languageOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="切片秒数">
            <el-input-number v-model="formData.chunkSeconds" class="!w-full" :min="5" :max="300" />
          </el-form-item>
          <el-form-item label="静音切片">
            <el-switch v-model="formData.enableSilenceDetect" />
          </el-form-item>
          <el-form-item label="整理文本">
            <el-switch v-model="formData.organizeText" />
          </el-form-item>
          <el-form-item v-if="formData.organizeText" label="整理模型">
            <el-select v-model="formData.summaryModelId" class="!w-full" clearable filterable placeholder="可选，默认文本模型">
              <el-option v-for="item in summaryModels" :key="item.id" :label="modelLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="覆盖结果">
            <el-switch v-model="formData.overwrite" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="startLoading" @click="submitTask">
              <Icon icon="ep:video-play" class="mr-5px" />
              开始转写
            </el-button>
            <el-button :disabled="!formData.esId" @click="refreshAll">
              <Icon icon="ep:refresh" class="mr-5px" />
              刷新
            </el-button>
          </el-form-item>
        </el-form>
      </ContentWrap>
    </el-col>

    <el-col :xs="24" :lg="16">
      <ContentWrap>
        <template #header>任务进度</template>
        <div class="progress-line">
          <el-progress :percentage="status.progress || 0" :status="status.status === 'FAILED' ? 'exception' : status.status === 'FINISHED' ? 'success' : undefined" />
          <div class="status-meta">
            <el-tag :type="statusTagType(status.status)">{{ statusLabel(status.status) }}</el-tag>
            <span>分片 {{ status.doneChunks || 0 }} / {{ status.totalChunks || 0 }}</span>
            <span>耗时 {{ durationText }}</span>
          </div>
        </div>

        <el-steps class="mt-18px" :active="activeStep" align-center finish-status="success" :process-status="status.status === 'FAILED' ? 'error' : 'process'">
          <el-step v-for="item in stepOptions" :key="item.value" :title="item.label" />
        </el-steps>

        <el-alert v-if="status.error" class="mt-18px" :title="status.error" type="error" show-icon :closable="false" />

        <div class="progress-actions">
          <el-button type="danger" plain :disabled="!canCancel" @click="cancelTask">
            <Icon icon="ep:close" class="mr-5px" />
            取消任务
          </el-button>
          <el-button type="primary" plain :disabled="status.status !== 'FINISHED'" @click="loadDetail">
            <Icon icon="ep:view" class="mr-5px" />
            查看结果
          </el-button>
        </div>
      </ContentWrap>

      <ContentWrap class="mt-16px">
        <template #header>转写结果</template>
        <el-empty v-if="!detail.rawTranscript && !detail.organizedText" description="暂无转写结果" />
        <el-tabs v-else v-model="activeTab">
          <el-tab-pane label="整理后文本" name="organized">
            <pre class="result-text">{{ detail.organizedText || detail.plainText }}</pre>
          </el-tab-pane>
          <el-tab-pane label="原始转写稿" name="raw">
            <pre class="result-text">{{ detail.rawTranscript }}</pre>
          </el-tab-pane>
          <el-tab-pane label="分片明细" name="segments">
            <el-table :data="detail.segments || []" stripe max-height="520">
              <el-table-column label="#" prop="index" width="70" />
              <el-table-column label="切片" prop="chunkIndex" width="80" />
              <el-table-column label="时间" width="190">
                <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
              </el-table-column>
              <el-table-column label="文本" prop="text" min-width="360" />
              <el-table-column label="语言" prop="language" width="110" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </ContentWrap>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { AudioAsrApi, AudioAsrStartReqVO } from '@/api/rag/audio-asr'
import { ModelApi } from '@/api/ai/model/model'

defineOptions({ name: 'RagAudioAsr' })

const router = useRouter()
const route = useRoute()
const message = useMessage()
const formRef = ref()
const startLoading = ref(false)
const asrModels = ref<any[]>([])
const summaryModels = ref<any[]>([])
const status = ref<any>({})
const detail = ref<any>({})
const activeTab = ref('organized')
let pollingTimer: ReturnType<typeof setInterval> | undefined

const formData = reactive<AudioAsrStartReqVO>({
  esId: '',
  language: 'auto',
  chunkSeconds: 30,
  overwrite: false,
  enableSilenceDetect: true,
  organizeText: true
})

const rules = {
  esId: [{ required: true, message: '请输入文档 ESID', trigger: 'blur' }]
}

const languageOptions = [
  { label: '自动识别', value: 'auto' },
  { label: '中文', value: 'Chinese' },
  { label: '英文', value: 'English' },
  { label: '日文', value: 'Japanese' },
  { label: '韩文', value: 'Korean' },
  { label: '法文', value: 'French' },
  { label: '德文', value: 'German' },
  { label: '西班牙文', value: 'Spanish' },
  { label: '俄文', value: 'Russian' }
]

const stepOptions = [
  { label: '等待', value: 'WAITING' },
  { label: '提取', value: 'EXTRACTING_AUDIO' },
  { label: '转码', value: 'CONVERTING_AUDIO' },
  { label: '切片', value: 'SPLITTING_AUDIO' },
  { label: '转写', value: 'TRANSCRIBING' },
  { label: '合并', value: 'MERGING' },
  { label: '整理', value: 'SUMMARIZING' },
  { label: '入库', value: 'INDEXING' },
  { label: '完成', value: 'FINISHED' }
]

const activeStep = computed(() => {
  const index = stepOptions.findIndex((item) => item.value === status.value.status)
  return index < 0 ? 0 : index
})

const canCancel = computed(() => {
  const value = status.value.status
  return value && !['FINISHED', 'FAILED'].includes(value)
})

const durationText = computed(() => {
  const start = status.value.startedAt
  const end = status.value.finishedAt || Date.now()
  if (!start) return '-'
  const seconds = Math.max(0, Math.floor((end - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
})

const loadOptions = async () => {
  const [voiceModels, chatModels] = await Promise.all([
    ModelApi.getModelSimpleList(3),
    ModelApi.getModelSimpleList(1)
  ])
  asrModels.value = voiceModels || []
  summaryModels.value = chatModels || []
}

const submitTask = async () => {
  await formRef.value?.validate()
  startLoading.value = true
  try {
    status.value = await AudioAsrApi.start(formData)
    message.success('音视频转写任务已启动')
    startPolling()
  } finally {
    startLoading.value = false
  }
}

const refreshAll = async () => {
  if (!formData.esId) return
  await loadStatus()
  if (status.value.status === 'FINISHED') {
    await loadDetail()
  }
}

const loadStatus = async () => {
  if (!formData.esId) return
  status.value = await AudioAsrApi.getStatus(formData.esId)
  if (status.value.status === 'FINISHED') {
    stopPolling()
    await loadDetail()
  }
  if (status.value.status === 'FAILED') {
    stopPolling()
  }
}

const loadDetail = async () => {
  if (!formData.esId) return
  detail.value = await AudioAsrApi.getDetail(formData.esId)
}

const cancelTask = async () => {
  if (!formData.esId) return
  await ElMessageBox.confirm('确定取消当前音视频转写任务吗？', '取消确认', { type: 'warning' })
  status.value = await AudioAsrApi.cancel(formData.esId)
  stopPolling()
  message.success('已提交取消请求')
}

const startPolling = () => {
  stopPolling()
  pollingTimer = setInterval(loadStatus, 2500)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = undefined
  }
}

const goTaskLog = () => {
  router.push({
    path: '/rag/apps/ai-task-log',
    query: {
      taskType: 'audio_asr',
      esId: formData.esId || undefined
    }
  })
}

const modelLabel = (item: any) => `${item.name || item.model || item.id}${item.model ? `（${item.model}）` : ''}`
const statusLabel = (value?: string) => stepOptions.find((item) => item.value === value)?.label || value || '等待'
const statusTagType = (value?: string) => {
  if (value === 'FINISHED') return 'success'
  if (value === 'FAILED') return 'danger'
  if (value === 'TRANSCRIBING') return 'primary'
  return 'info'
}

onMounted(async () => {
  if (route.query.esId) {
    formData.esId = String(route.query.esId)
  }
  await loadOptions()
  await refreshAll()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2a37;
}

.progress-line {
  display: grid;
  gap: 12px;
}

.status-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: #667085;
  font-size: 13px;
}

.progress-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.result-text {
  min-height: 260px;
  max-height: 620px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.72;
  color: #1f2937;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  border-radius: 8px;
}
</style>
