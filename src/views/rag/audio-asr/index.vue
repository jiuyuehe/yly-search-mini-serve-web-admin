<template>
  <div class="governance-page audio-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / AI 数据智能治理 / <span>音视频智能解析</span></div>
          <div class="governance-page-title">音视频智能转写与语音合成</div>
          <div class="governance-page-subtitle">转写任务、分片进度、摘要结果与 TTS 预览统一管理。</div>
        </div>
      <el-button v-hasPermi="['rag:ai-task-log:query']" @click="goTaskLog">
        <Icon icon="ep:document" class="mr-5px" />
        任务日志
      </el-button>
    </div>
  </ContentWrap>

    <div class="governance-kpi-grid audio-kpi-grid">
      <div v-for="item in audioKpiCards" :key="item.label" class="governance-kpi-card">
        <div class="governance-kpi-label">{{ item.label }}</div>
        <div class="governance-kpi-value">{{ item.value }}</div>
        <div class="governance-kpi-delta">当前状态 <span>{{ item.delta }}</span></div>
      </div>
    </div>

  <el-tabs v-model="activeMode" class="audio-tabs">
    <el-tab-pane label="长音频转写" name="asr">
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
                  <el-option v-for="item in voiceModels" :key="item.id" :label="modelLabel(item)" :value="item.id" />
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
              <el-form-item label="自动摘要">
                <el-switch v-model="formData.organizeText" />
              </el-form-item>
              <el-form-item v-if="formData.organizeText" label="摘要模型">
                <el-select v-model="formData.summaryModelId" class="!w-full" clearable filterable placeholder="可选，默认文本模型">
                  <el-option v-for="item in summaryModels" :key="item.id" :label="modelLabel(item)" :value="item.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="覆盖结果">
                <el-switch v-model="formData.overwrite" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="startLoading" @click="submitTask" v-hasPermi="['rag:audio-asr:operate']">
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
              <el-button type="danger" plain :disabled="!canCancel" @click="cancelTask" v-hasPermi="['rag:audio-asr:operate']">
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
            <template #header>
              <div class="result-head">
                <span>转写结果</span>
                <el-button
                  v-if="detail.plainText"
                  type="primary"
                  plain
                  size="small"
                  :loading="summarizeLoading"
                  @click="summarizeTranscript"
                  v-hasPermi="['rag:audio-asr:operate']"
                >
                  <Icon icon="ep:magic-stick" class="mr-5px" />
                  生成摘要
                </el-button>
              </div>
            </template>
            <el-empty v-if="!detail.rawTranscript && !detail.organizedText" description="暂无转写结果" />
            <el-tabs v-else v-model="activeTab">
              <el-tab-pane label="摘要/整理文本" name="organized">
                <pre class="result-text">{{ detail.organizedText || detail.summaryText || detail.plainText }}</pre>
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
    </el-tab-pane>

    <el-tab-pane label="文本转语音" name="tts">
      <el-row :gutter="16">
        <el-col :xs="24" :lg="9">
          <ContentWrap>
            <template #header>TTS 合成</template>
            <el-form ref="ttsFormRef" :model="ttsForm" :rules="ttsRules" label-width="96px">
              <el-form-item label="TTS 模型">
                <el-select v-model="ttsForm.modelId" class="!w-full" clearable filterable placeholder="默认优先 Qwen3-TTS">
                  <el-option v-for="item in voiceModels" :key="item.id" :label="modelLabel(item)" :value="item.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="音色">
                <el-select v-model="ttsForm.voice" class="!w-full">
                  <el-option v-for="item in voiceOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="格式">
                <el-select v-model="ttsForm.responseFormat" class="!w-full">
                  <el-option v-for="item in formatOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="语速">
                <el-input-number v-model="ttsForm.speed" class="!w-full" :min="0.25" :max="4" :step="0.05" />
              </el-form-item>
              <el-form-item label="文本" prop="text">
                <el-input v-model="ttsForm.text" type="textarea" :rows="10" maxlength="4000" show-word-limit placeholder="请输入需要合成为语音的文本" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="ttsLoading" @click="generateSpeech" v-hasPermi="['rag:audio-asr:operate']">
                  <Icon icon="ep:microphone" class="mr-5px" />
                  生成语音
                </el-button>
                <el-button :disabled="!ttsAudioUrl" @click="downloadSpeech">
                  <Icon icon="ep:download" class="mr-5px" />
                  下载
                </el-button>
              </el-form-item>
            </el-form>
          </ContentWrap>
        </el-col>

        <el-col :xs="24" :lg="15">
          <ContentWrap>
            <template #header>语音预览</template>
            <el-empty v-if="!ttsAudioUrl" description="暂无语音" />
            <div v-else class="tts-player">
              <audio :src="ttsAudioUrl" controls></audio>
            </div>
          </ContentWrap>
        </el-col>
      </el-row>
    </el-tab-pane>
  </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { AudioAsrApi, AudioAsrStartReqVO, AudioTtsReqVO } from '@/api/rag/audio-asr'
import { ModelApi } from '@/api/ai/model/model'

defineOptions({ name: 'RagAudioAsr' })

const router = useRouter()
const route = useRoute()
const message = useMessage()
const formRef = ref()
const ttsFormRef = ref()
const startLoading = ref(false)
const summarizeLoading = ref(false)
const ttsLoading = ref(false)
const voiceModels = ref<any[]>([])
const summaryModels = ref<any[]>([])
const status = ref<any>({})
const detail = ref<any>({})
const activeMode = ref('asr')
const activeTab = ref('organized')
const ttsAudioUrl = ref('')
const ttsAudioBlob = ref<Blob>()
let pollingTimer: ReturnType<typeof setInterval> | undefined

const formData = reactive<AudioAsrStartReqVO>({
  esId: '',
  language: 'auto',
  chunkSeconds: 5,
  overwrite: false,
  enableSilenceDetect: true,
  organizeText: true
})

const ttsForm = reactive<AudioTtsReqVO>({
  text: '',
  voice: 'alloy',
  responseFormat: 'mp3',
  speed: 1
})

const rules = {
  esId: [{ required: true, message: '请输入文档 ESID', trigger: 'blur' }]
}

const ttsRules = {
  text: [{ required: true, message: '请输入需要合成的文本', trigger: 'blur' }]
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

const voiceOptions = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse']
const formatOptions = ['mp3', 'wav', 'opus', 'aac', 'flac', 'pcm']

const stepOptions = [
  { label: '等待', value: 'WAITING' },
  { label: '提取', value: 'EXTRACTING_AUDIO' },
  { label: '转码', value: 'CONVERTING_AUDIO' },
  { label: '切片', value: 'SPLITTING_AUDIO' },
  { label: '转写', value: 'TRANSCRIBING' },
  { label: '合并', value: 'MERGING' },
  { label: '摘要', value: 'SUMMARIZING' },
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

const audioKpiCards = computed(() => [
  { label: '转写状态', value: statusLabel(status.value.status), delta: status.value.status || 'WAITING' },
  { label: '分片进度', value: `${status.value.doneChunks || 0}/${status.value.totalChunks || 0}`, delta: `${status.value.progress || 0}%` },
  { label: '默认切片', value: `${formData.chunkSeconds || 5}s`, delta: '模型友好' },
  { label: '摘要结果', value: detail.value.summaryText || detail.value.organizedText ? '已生成' : '待生成', delta: detail.value.plainText ? '可摘要' : '待转写' },
  { label: 'TTS 格式', value: String(ttsForm.responseFormat || 'mp3').toUpperCase(), delta: ttsForm.voice || 'alloy' },
  { label: '语音预览', value: ttsAudioUrl.value ? '已生成' : '待生成', delta: `${ttsForm.speed || 1}x` }
])

const loadOptions = async () => {
  const [voiceList, chatModels] = await Promise.all([
    ModelApi.getModelSimpleList(3),
    ModelApi.getModelSimpleList(1)
  ])
  voiceModels.value = voiceList || []
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

const summarizeTranscript = async () => {
  if (!formData.esId || !detail.value.plainText) return
  summarizeLoading.value = true
  try {
    detail.value = await AudioAsrApi.summarize({
      esId: formData.esId,
      modelId: formData.summaryModelId,
      targetLength: 200,
      language: formData.language === 'auto' ? undefined : formData.language
    })
    activeTab.value = 'organized'
    message.success('摘要已生成')
  } finally {
    summarizeLoading.value = false
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

const generateSpeech = async () => {
  await ttsFormRef.value?.validate()
  ttsLoading.value = true
  try {
    const blob = await AudioAsrApi.tts(ttsForm)
    revokeTtsUrl()
    ttsAudioBlob.value = blob
    ttsAudioUrl.value = URL.createObjectURL(blob)
    message.success('语音已生成')
  } finally {
    ttsLoading.value = false
  }
}

const downloadSpeech = () => {
  if (!ttsAudioBlob.value || !ttsAudioUrl.value) return
  const link = document.createElement('a')
  link.href = ttsAudioUrl.value
  link.download = `tts.${ttsForm.responseFormat || 'mp3'}`
  link.click()
}

const revokeTtsUrl = () => {
  if (ttsAudioUrl.value) {
    URL.revokeObjectURL(ttsAudioUrl.value)
    ttsAudioUrl.value = ''
  }
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
    path: '/data-governance-dashboard/ai-task',
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
  revokeTtsUrl()
})
</script>

<style scoped>
.audio-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audio-kpi-grid {
  margin-bottom: 0;
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

.progress-actions,
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.progress-actions {
  justify-content: flex-end;
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

.tts-player {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
}

.tts-player audio {
  width: min(720px, 100%);
}
</style>
