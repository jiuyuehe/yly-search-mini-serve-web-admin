<template>
  <div class="chat-content">
    <div class="chat-header" :class="{ isMobile }">
      <el-button v-if="isMobile" text class="mobile-menu-btn" @click="$emit('show-session-drawer')">
        <el-icon><Menu /></el-icon>
      </el-button>
      <h3>{{ title }}</h3>
    </div>

    <div class="chat-box">
      <div ref="chatRef" class="chat-scroll" @scroll="handleChatScroll">
        <MessageListEmpty
          v-if="!chatList.length && !loading"
          :title="title"
          @prompt="handlePromptSend"
        />
        <div v-else class="chat-list">
          <article
            v-for="(item, index) in chatList"
            :key="getMessageKey(item, index)"
            class="chat-item"
            :class="item.role === 'user' ? 'is-user' : 'is-assistant'"
          >
            <el-avatar :size="34" :src="item.avatar" class="chat-avatar" />
            <div class="chat-message">
              <div class="chat-message-content">
                <div v-if="isStreamingPlaceholder(item, index)" class="chat-thinking">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  <span>思考中...</span>
                </div>

                <MessageReasoning
                  v-if="item.reasoning"
                  :reasoning-content="item.reasoning"
                  :content="stripHtml(item.content)"
                  :streaming="isStreamingAssistantMessage(item, index)"
                />

                <div
                  v-if="item.content"
                  class="rag-markdown"
                  :class="{ 'is-user-content': item.role === 'user' }"
                  v-html="renderMessageContent(item)"
                ></div>

                <div v-if="item.fileList.length > 0" class="file-list-row">
                  <div
                    v-for="file in item.fileList"
                    :key="`${file.dataset_id}-${file.document_id}-${file.name}`"
                    class="file-list-item"
                  >
                    <el-icon class="file-icon"><Document /></el-icon>
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-actions">
                      <el-tooltip content="预览" placement="top">
                        <button class="file-action" type="button" @click.stop="handlePreviewFile(file)">
                          <el-icon><View /></el-icon>
                        </button>
                      </el-tooltip>
                      <el-tooltip content="下载" placement="top">
                        <button class="file-action" type="button" @click.stop="handleDownloadFile(file)">
                          <el-icon><Download /></el-icon>
                        </button>
                      </el-tooltip>
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="shouldShowAssistantActions(item, index)" class="chat-action-row">
                <el-button text size="small" @click="handleOperation('replay', index)">
                  <el-icon><RefreshRight /></el-icon>
                </el-button>
                <el-button text size="small" @click="copyContent(stripHtml(item.content))">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
                <el-button plain size="small" @click="exportToWord(stripHtml(item.content))">
                  导出Word
                </el-button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <el-button v-show="isShowToBottom" class="bottom-btn" circle @click="backBottom">
        <el-icon><ArrowDown /></el-icon>
      </el-button>
    </div>

    <div class="chat-sender-card">
      <div class="chat-input-prefix">
        <el-dropdown @command="clickHandler">
          <el-button text class="sender-setting-btn">
            <el-icon><Setting /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="prompt">提示词设置</el-dropdown-item>
              <el-dropdown-item command="model">模型设置</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <div v-if="inputType === 'sender' && showKnowledgeBaseSelector" class="chat-input-controls">
          <el-switch
            v-model="isUseKnowledgeBase"
            :disabled="knowledgeBaseSwitchDisabled || enabledSelectOptions.length === 0"
            active-text="知识库"
            @change="onSwitchChange"
          />

          <el-select
            v-model="selectValue"
            multiple
            collapse-tags
            collapse-tags-tooltip
            :disabled="knowledgeBaseSwitchDisabled"
            placeholder="请选择知识库"
            class="model-select"
            @change="handleKnowledgeBaseSelectChange"
          >
            <el-option
              v-for="item in limitedKnowledgeBaseOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
              :disabled="item.disabled"
            />
          </el-select>

          <span
            v-if="isUseKnowledgeBase && currentKnowledgeBaseLabel"
            class="knowledge-base-chip"
            :title="currentKnowledgeBaseLabel"
          >
            {{ currentKnowledgeBaseLabel }}
          </span>
        </div>
      </div>

      <el-input
        v-model="inputValue"
        class="chat-textarea"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        :placeholder="senderPlaceholder"
        :disabled="senderDisabled && !streaming"
        @keydown="handleKeydown"
      />

      <div class="chat-sender-footer">
        <el-button
          v-if="streaming"
          class="send-circle-btn is-stop"
          type="danger"
          circle
          @click="$emit('stop')"
        >
          <el-icon><Close /></el-icon>
        </el-button>
        <el-button
          v-else
          class="send-circle-btn"
          type="primary"
          circle
          :disabled="senderDisabled"
          @click="handleSend"
        >
          <el-icon><Promotion /></el-icon>
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="chat-loading-mask">
      <MessageLoading />
    </div>

    <div id="imagePreviewModal" class="modal">
      <span class="close" @click="closeImagePreview">&times;</span>
      <img class="modal-content" :src="previewImageUrl" />
    </div>

    <PromptSettingDialog
      v-model:visible="showPromptDialog"
      :knowledge-base="currentKnowledgeBases"
      :chat-id="chatId"
      :assistant-scene="assistantScene"
    />
    <ModelSettingDialog
      v-model:visible="showModelDialog"
      :knowledge-base="currentKnowledgeBases"
      :chat-id="chatId"
      :assistant-scene="assistantScene"
    />
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { useClipboard } from '@vueuse/core'
import type { PropType } from 'vue'
import {
  ArrowDown,
  Close,
  CopyDocument,
  Document,
  Download,
  Loading,
  Menu,
  Promotion,
  RefreshRight,
  Setting,
  View
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { downloadDocument, getRagflowDomain } from '@/api/rag-aichat/document'
import { getConfigKey } from '@/api/rag-aichat/system'
import PromptSettingDialog from '@/views/rag-aichat/components/PromptSettingDialog.vue'
import ModelSettingDialog from '@/views/rag-aichat/components/ModelSettingDialog.vue'
import MessageListEmpty from './message/MessageListEmpty.vue'
import MessageLoading from './message/MessageLoading.vue'
import MessageReasoning from './message/MessageReasoning.vue'

defineOptions({ name: 'RagAiChatPanel' })

declare global {
  interface Window {
    openImagePreview?: (imageId: string) => void
    closeImagePreview?: () => void
  }
}

type ChatPanelMessage = {
  id?: string
  localId?: string
  role: string
  content: string
  reasoning?: string
  reference?: any[]
  rawContent?: string
}

type KnowledgeBaseOption = {
  label: string
  shortLabel?: string
  value: string
  disabled?: boolean
}

type FileItem = {
  name: string
  dataset_id: string
  document_id: string
}

type DisplayMessage = ChatPanelMessage & {
  avatar: string
  fileList: FileItem[]
}

const props = defineProps({
  sessionId: [String, Number],
  chatId: { type: String, required: true },
  title: { type: String, default: 'AI问答' },
  messages: {
    type: Array as PropType<ChatPanelMessage[]>,
    default: () => []
  },
  inputType: { type: String, default: 'sender' },
  showKnowledgeBaseSelector: { type: Boolean, default: true },
  knowledgeBaseOptions: {
    type: Array as PropType<KnowledgeBaseOption[]>,
    default: () => []
  },
  selectedKnowledgeBaseIds: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  assistantScene: { type: String, default: 'GENERAL_CHAT' },
  loading: { type: Boolean, default: false },
  streaming: { type: Boolean, default: false }
})

const emit = defineEmits([
  'send',
  'stop',
  'knowledgeBaseChange',
  'show-session-drawer'
])

const MAX_KNOWLEDGE_BASE_SELECTION = 3
const REFERENCE_TOKEN_REGEXP = /\[ID:(\d+)\]|ID:(\d+)/g
const md = new MarkdownIt({ html: true, linkify: true, breaks: true })
const { copy } = useClipboard({ legacy: true })
const env = (import.meta as any).env || {}
const userAvatar = new URL('../../../../assets/images/user.png', import.meta.url).href
const aiAvatar = new URL('../../../../assets/images/ai.png', import.meta.url).href

const chatRef = ref<HTMLElement | null>(null)
const inputValue = ref('')
const isShowToBottom = ref(false)
const isUseKnowledgeBase = ref(false)
const isSyncingKnowledgeBaseControls = ref(false)
const selectValue = ref<string[]>([])
const showPromptDialog = ref(false)
const showModelDialog = ref(false)
const ragflowDomain = ref('')
const previewImageUrl = ref('')
const windowWidth = ref(window.innerWidth)

const normalizeReferenceList = (reference: any) => {
  if (Array.isArray(reference)) return reference
  if (Array.isArray(reference?.chunks)) return reference.chunks
  return []
}

const escapeHtml = (value: any) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return map[char] || char
  })

const getChunkField = (chunk: any, keys: string[] = []) => {
  for (const key of keys) {
    const value = chunk?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

const resolveReferenceChunk = (reference: any[], rawId: string) => {
  if (!Array.isArray(reference) || !reference.length) return null
  const numericId = Number.parseInt(String(rawId), 10)
  const candidateIndexes: number[] = []

  if (Number.isFinite(numericId)) {
    if (numericId >= 0) candidateIndexes.push(numericId)
    if (numericId - 1 >= 0) candidateIndexes.push(numericId - 1)
  }

  const visited = new Set<number>()
  for (const index of candidateIndexes) {
    if (visited.has(index)) continue
    visited.add(index)
    if (!reference[index]) continue
    const citation =
      numericId === index ? index + 1 : numericId > 0 && numericId - 1 === index ? numericId : index + 1
    return { chunk: reference[index], index, citation }
  }

  const metaIndex = reference.findIndex((chunk) =>
    [
      chunk?.id,
      chunk?.chunk_id,
      chunk?.chunkId,
      chunk?.index,
      chunk?.position,
      chunk?.ref_id,
      chunk?.refId
    ].some((value) => String(value ?? '') === String(rawId))
  )

  if (metaIndex >= 0) {
    return {
      chunk: reference[metaIndex],
      index: metaIndex,
      citation: Number.isFinite(numericId) && numericId > 0 ? numericId : metaIndex + 1
    }
  }

  return null
}

const trimTrailingSlash = (value: string) => String(value || '').replace(/\/+$/, '')

const normalizeUrlValue = (url?: string | null) => String(url || '').trim()

const ensureTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`)

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url)

const resolveOrigin = (origin?: string | null) => {
  const normalizedOrigin = normalizeUrlValue(origin)
  if (!normalizedOrigin) return window.location.origin
  return new URL(normalizedOrigin, `${window.location.origin}/`).origin
}

const getBasePath = (url: string) => {
  if (isHttpUrl(url)) {
    return ensureTrailingSlash(new URL(url).pathname)
  }
  const normalizedPath = url.startsWith('/') ? url : `/${url}`
  return ensureTrailingSlash(normalizedPath)
}

const buildApiUrl = (path: string, origin?: string) => {
  const baseURL = normalizeUrlValue(env.VITE_API_BASE_URL) || '/admin-api/'
  const normalizedPath = path.replace(/^\/+/, '')
  if (!origin && isHttpUrl(baseURL)) {
    return new URL(normalizedPath, baseURL).toString()
  }
  const baseOrigin = resolveOrigin(origin)
  const normalizedBase = getBasePath(baseURL).replace(/^\/+/, '')
  return new URL(`${normalizedBase}${normalizedPath}`, `${baseOrigin}/`).toString()
}

const resolvePreviewBaseUrl = (previewUrl?: string | null, origin?: string) => {
  const normalizedPreviewUrl = normalizeUrlValue(previewUrl)
  if (normalizedPreviewUrl) {
    return new URL(normalizedPreviewUrl, `${resolveOrigin(origin)}/`).toString()
  }
  const previewLocation = new URL(resolveOrigin(origin))
  previewLocation.protocol = 'http:'
  previewLocation.port = '48018'
  previewLocation.pathname = '/preview/onlinePrevieww'
  previewLocation.search = ''
  previewLocation.hash = ''
  return previewLocation.toString()
}

function getImgPreviewUrl(imageId: string) {
  return imageId ? `${ragflowDomain.value}/v1/document/image/${imageId}` : ''
}

const getFileExt = (name = '') => {
  if (!String(name || '').includes('.')) return ''
  const ext = String(name || '').split('.').pop() || ''
  return ext.toLowerCase()
}

const buildRagflowDocumentPreviewUrl = (
  domain: string,
  documentId: string,
  fileName: string
) => {
  const previewUrl = new URL(
    `/document/${encodeURIComponent(documentId)}`,
    `${trimTrailingSlash(domain)}/`
  )
  previewUrl.searchParams.set('ext', getFileExt(fileName))
  previewUrl.searchParams.set('prefix', 'document')
  return previewUrl.toString()
}

const buildDownloadViewPreviewUrl = async (file: FileItem) => {
  const previewRes = await getConfigKey('online_preview_url')
  const ragRes = await getConfigKey('online_rag_url')
  const previewUrl = resolvePreviewBaseUrl(
    (previewRes as any)?.data || previewRes || env.VITE_ONLINE_PREVIEW_URL
  )
  const ragUrl = (ragRes as any)?.data || ragRes || env.VITE_ONLINE_RAG_URL || ''
  const downloadViewUrl = buildApiUrl(
    `ragflow/documents/downloadView/${file.dataset_id}/${file.document_id}/${file.name}`,
    ragUrl
  )
  const previewWindowUrl = new URL(previewUrl)
  previewWindowUrl.searchParams.set('url', downloadViewUrl)
  previewWindowUrl.searchParams.set('fullfilename', file.name)
  return previewWindowUrl.toString()
}

const openPreviewWithFallback = async (primaryUrl: string, fallbackUrl: string) => {
  const previewWindow = window.open('about:blank', '_blank')
  if (!previewWindow) {
    window.open(fallbackUrl, '_blank')
    return
  }
  previewWindow.document.write('<p style="font-family: sans-serif; padding: 16px;">正在打开文件预览...</p>')
  try {
    await fetch(primaryUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store'
    })
    previewWindow.location.href = primaryUrl
  } catch {
    previewWindow.location.href = fallbackUrl
  }
}

function extractFileList(content: string, reference: any[]) {
  const references = normalizeReferenceList(reference)
  if (!references.length) return []

  const fileMap = new Map<string, FileItem>()
  const addChunkFile = (chunk: any) => {
    const fileName = String(
      getChunkField(chunk, ['document_name', 'documentName', 'doc_name'])
    ).trim()
    const datasetId = String(getChunkField(chunk, ['dataset_id', 'datasetId'])).trim()
    const documentId = String(getChunkField(chunk, ['document_id', 'documentId'])).trim()
    if (!fileName || !datasetId || !documentId) return

    fileMap.set(fileName, {
      name: fileName,
      dataset_id: datasetId,
      document_id: documentId
    })
  }

  const matches = Array.from(String(content || '').matchAll(REFERENCE_TOKEN_REGEXP))
  if (!matches.length) return []

  matches.forEach((match) => {
    const rawId = match[1] || match[2]
    const resolved = resolveReferenceChunk(references, rawId)
    if (resolved?.chunk) {
      addChunkFile(resolved.chunk)
    }
  })

  return Array.from(fileMap.values())
}

function highlightReferenceIds(content: string, reference: any[]) {
  const references = normalizeReferenceList(reference)
  if (!references.length) return content

  return String(content || '').replace(REFERENCE_TOKEN_REGEXP, (match, bracketId, plainId) => {
    const rawId = bracketId || plainId
    const resolved = resolveReferenceChunk(references, rawId)
    if (!resolved?.chunk) return match

    const imageId = String(getChunkField(resolved.chunk, ['image_id', 'imageId'])).trim()
    const imageBlock = imageId
      ? `<img class="chunk-img" src="${escapeHtml(getImgPreviewUrl(imageId))}" onclick="openImagePreview('${escapeHtml(imageId)}')" />`
      : ''
    const chunkContent = escapeHtml(
      getChunkField(resolved.chunk, ['content', 'chunk_content', 'text'])
    )
    const documentName = escapeHtml(
      getChunkField(resolved.chunk, ['document_name', 'documentName', 'doc_name']) ||
        `引用 ${resolved.citation}`
    )

    return `<sup class="ref-tooltip"><span class="ref-index">[${resolved.citation}]</span><span class="tooltip-content">${imageBlock}<span class="chunk-info"><span class="chunk-content">${chunkContent}</span><span class="chunk-name">${documentName}</span></span></span></sup>`
  })
}

const chatList = computed<DisplayMessage[]>(() =>
  (props.messages || []).map((message) => {
    const reference = normalizeReferenceList(message.reference)
    return {
      ...message,
      avatar: message.role === 'user' ? userAvatar : aiAvatar,
      content:
        message.role === 'assistant'
          ? highlightReferenceIds(message.content, reference)
          : message.content,
      reasoning: message.reasoning || '',
      reference,
      fileList: message.role === 'assistant' ? extractFileList(message.content, reference) : []
    }
  })
)

const isMobile = computed(() => windowWidth.value <= 768)
const senderDisabled = computed(() => !props.chatId || !props.sessionId || props.loading)
const enabledSelectOptions = computed(() => props.knowledgeBaseOptions.filter((item) => !item.disabled))
const limitedKnowledgeBaseOptions = computed(() => {
  const selectedIds = new Set(selectValue.value.map((item) => String(item)))
  const reachedMax = selectedIds.size >= MAX_KNOWLEDGE_BASE_SELECTION
  return props.knowledgeBaseOptions.map((item) => ({
    ...item,
    disabled: item.disabled || (reachedMax && !selectedIds.has(String(item.value)))
  }))
})
const knowledgeBaseSwitchDisabled = computed(() => props.loading || props.streaming)
const currentKnowledgeBases = computed(() => {
  if (!selectValue.value.length) return []
  return props.knowledgeBaseOptions.filter((item) =>
    selectValue.value.includes(String(item.value))
  )
})
const currentKnowledgeBaseLabel = computed(() => {
  if (!currentKnowledgeBases.value.length) return ''
  if (currentKnowledgeBases.value.length === 1) {
    return currentKnowledgeBases.value[0]?.shortLabel || currentKnowledgeBases.value[0]?.label || ''
  }
  return `已选择 ${currentKnowledgeBases.value.length} 个知识库`
})
const senderPlaceholder = computed(() => {
  if (!props.chatId || !props.sessionId) return '会话初始化中，请稍候...'
  if (props.inputType === 'sender' && isUseKnowledgeBase.value) {
    if (currentKnowledgeBases.value.length === 1) {
      return `请输入问题，将结合“${currentKnowledgeBases.value[0].shortLabel}”回答`
    }
    if (currentKnowledgeBases.value.length > 1) {
      return `请输入问题，将结合已选 ${currentKnowledgeBases.value.length} 个知识库回答`
    }
  }
  return '请输入您想了解的内容，Shift + Enter 换行'
})

const renderMessageContent = (item: DisplayMessage) => {
  if (item.role === 'user') return escapeHtml(item.content).replace(/\n/g, '<br />')
  return md.render(item.content || '')
}

const backBottom = () => {
  if (!chatRef.value) return
  chatRef.value.scrollTop = 0
}

const stripHtml = (html: string) => String(html || '').replace(/<[^>]+>/g, '')

const getMessageKey = (item: DisplayMessage, index: number) =>
  [String(props.sessionId || ''), item.localId || item.id || '', item.role, index].join(':')

const isStreamingAssistantMessage = (item: DisplayMessage, index: number) =>
  props.streaming && item.role === 'assistant' && index === 0

const isStreamingPlaceholder = (item: DisplayMessage, index: number) =>
  isStreamingAssistantMessage(item, index) && !item.reasoning && !item.content

const shouldShowAssistantActions = (item: DisplayMessage, index: number) =>
  item.role === 'assistant' && !(props.streaming && index === 0)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const handleChatScroll = () => {
  const target = chatRef.value
  isShowToBottom.value = !!target && target.scrollTop < -120
}

const doSend = (value: string, replay = false) => {
  const question = String(value || '').trim()
  if (!question) return
  emit('send', {
    question,
    datasetIds: isUseKnowledgeBase.value ? selectValue.value.slice() : [],
    replay
  })
  inputValue.value = ''
}

const handleSend = () => {
  doSend(inputValue.value)
}

const handlePromptSend = (prompt: string) => {
  inputValue.value = prompt
  doSend(prompt)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  handleSend()
}

const copyContent = async (content: string) => {
  await copy(content)
  ElMessage.success('复制成功！')
}

const handleOperation = (type: string, index: number) => {
  if (type !== 'replay') return
  const userMessage = props.messages[index + 1]
  if (!userMessage || userMessage.role !== 'user') return
  doSend(userMessage.content, true)
}

const exportToWord = (content: string) => {
  const htmlContent = md.render(content || '')
  const blob = new Blob(
    [`<html><head><meta charset="utf-8"></head><body>${htmlContent}</body></html>`],
    { type: 'application/msword' }
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'chat.doc'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const onSwitchChange = (value: boolean) => {
  if (value && enabledSelectOptions.value.length === 0) {
    ElMessage.warning('没有可用的知识库')
    isUseKnowledgeBase.value = false
    return
  }
  if (!value) {
    selectValue.value = []
  }
}

const limitKnowledgeBaseSelection = (ids: any[] = [], showWarning = false) => {
  const normalizedIds = ids.map((item) => String(item || '')).filter(Boolean)
  if (normalizedIds.length <= MAX_KNOWLEDGE_BASE_SELECTION) return normalizedIds
  if (showWarning) {
    ElMessage.warning(`最多只能选择 ${MAX_KNOWLEDGE_BASE_SELECTION} 个知识库`)
  }
  return normalizedIds.slice(0, MAX_KNOWLEDGE_BASE_SELECTION)
}

const handleKnowledgeBaseSelectChange = (value: any) => {
  const nextValue = limitKnowledgeBaseSelection(Array.isArray(value) ? value : [], true)
  selectValue.value = nextValue
  isUseKnowledgeBase.value = nextValue.length > 0
}

const fetchRagflowDomain = async () => {
  if (ragflowDomain.value) return ragflowDomain.value
  const res = await getRagflowDomain()
  const domain = res?.data || res || env.VITE_ONLINE_RAG_URL || ''
  ragflowDomain.value = String(domain || '').replace(/\/+$/, '')
  return ragflowDomain.value
}

const handlePreviewFile = async (file: FileItem) => {
  if (!file.document_id) return
  const [domain, fallbackUrl] = await Promise.all([
    fetchRagflowDomain(),
    buildDownloadViewPreviewUrl(file)
  ])
  const ragflowPreviewUrl = buildRagflowDocumentPreviewUrl(domain, file.document_id, file.name)
  await openPreviewWithFallback(ragflowPreviewUrl, fallbackUrl)
}

const handleDownloadFile = async (file: FileItem) => {
  if (!file.dataset_id || !file.document_id) return
  const response = await downloadDocument(file.dataset_id, file.document_id)
  const blob = new Blob([response as BlobPart], {
    type: (response as Blob)?.type || 'application/octet-stream'
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const clickHandler = (value: string) => {
  if (value === 'prompt') {
    showPromptDialog.value = true
    return
  }
  if (value === 'model') {
    showModelDialog.value = true
  }
}

const closeImagePreview = () => {
  previewImageUrl.value = ''
  const modal = document.getElementById('imagePreviewModal')
  if (modal) modal.style.display = 'none'
}

const handleImagePreviewEsc = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeImagePreview()
}

const syncKnowledgeBaseControls = async () => {
  isSyncingKnowledgeBaseControls.value = true
  const matchedIds = props.selectedKnowledgeBaseIds.filter((id) =>
    enabledSelectOptions.value.some((item) => String(item.value) === id)
  )
  const limitedIds = limitKnowledgeBaseSelection(matchedIds)
  selectValue.value = limitedIds
  isUseKnowledgeBase.value = limitedIds.length > 0
  await nextTick()
  isSyncingKnowledgeBaseControls.value = false

  if (matchedIds.length !== limitedIds.length && props.showKnowledgeBaseSelector) {
    emit('knowledgeBaseChange', limitedIds)
  }
}

watch(
  () => props.selectedKnowledgeBaseIds.slice(),
  () => {
    syncKnowledgeBaseControls()
  },
  { immediate: true }
)

watch(
  () => chatList.value.map((item) => `${item.role}:${item.content}:${item.reasoning}`).join('||'),
  async () => {
    await nextTick()
    backBottom()
  },
  { immediate: true }
)

watch(
  [isUseKnowledgeBase, () => selectValue.value.slice().sort().join(',')],
  ([useKnowledgeBase]) => {
    if (isSyncingKnowledgeBaseControls.value) return
    if (!props.showKnowledgeBaseSelector) return
    emit('knowledgeBaseChange', useKnowledgeBase ? selectValue.value.slice() : [])
  }
)

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleImagePreviewEsc)
  await fetchRagflowDomain()

  window.openImagePreview = (imageId: string) => {
    previewImageUrl.value = getImgPreviewUrl(imageId)
    const modal = document.getElementById('imagePreviewModal')
    if (modal) {
      modal.style.display = 'block'
      modal.onclick = (event) => {
        if (event.target === modal) closeImagePreview()
      }
    }
  }

  window.closeImagePreview = closeImagePreview
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleImagePreviewEsc)
  window.openImagePreview = undefined
  window.closeImagePreview = undefined
})
</script>

<style scoped>
.chat-content {
  position: relative;
  display: flex;
  width: 0;
  height: 100%;
  min-width: 320px;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  flex: 1;
  flex-direction: column;
}

.chat-header {
  display: flex;
  height: 56px;
  padding: 0 18px;
  background: #fff;
  border-bottom: 1px solid rgb(15 23 42 / 4%);
  align-items: center;
  flex-shrink: 0;
}

.chat-header.isMobile {
  padding: 0 10px;
}

.chat-header h3 {
  margin: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: var(--app-font-weight-semibold);
  color: var(--app-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.mobile-menu-btn {
  margin-right: 5px;
}

.chat-box {
  position: relative;
  display: flex;
  min-height: 0;
  padding: 22px 24px 12px;
  overflow: hidden;
  flex: 1 1 auto;
  flex-direction: column;
  background: #fff;
}

.chat-scroll {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  flex-direction: column-reverse;
}

.chat-list {
  display: flex;
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  padding: 8px 0 20px;
  margin: 0 auto;
  flex-direction: column-reverse;
  gap: 70px;
}

.chat-item {
  display: flex;
  width: 100%;
  gap: 16px;
  align-items: flex-start;
}

.chat-item.is-user {
  flex-direction: row-reverse;
  align-items: center;
}

.chat-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}

.chat-item.is-assistant .chat-avatar {
  background: var(--app-color-brand);
}

.chat-message {
  max-width: min(980px, calc(100% - 64px));
  min-width: 0;
}

.chat-item.is-user .chat-message {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: min(680px, calc(100% - 64px));
}

.chat-message-content {
  min-width: 0;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.chat-item.is-user .chat-message-content {
  color: #667085;
  text-align: right;
  background: transparent;
  border-color: transparent;
}

.chat-thinking {
  display: inline-flex;
  color: var(--app-text-secondary);
  align-items: center;
  gap: 6px;
}

.chat-action-row {
  display: inline-flex;
  min-height: 30px;
  margin-top: 18px;
  line-height: 1;
  vertical-align: middle;
  align-items: center;
  gap: 6px;
}

.chat-action-row :deep(.el-button) {
  height: 30px;
  padding: 0 10px;
  margin-left: 0;
  color: var(--app-text-primary);
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
  box-shadow: none;
}

.chat-action-row :deep(.el-button.is-text) {
  width: 34px;
  padding: 0;
}

.chat-action-row :deep(.el-button + .el-button) {
  margin-left: 0;
}

.bottom-btn {
  position: absolute;
  right: 16px;
  bottom: 136px;
  width: 36px;
  height: 36px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  box-shadow: var(--app-shadow-xs);
}

.chat-sender-card {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  padding: 0 24px 18px;
  background: #fff;
  border-top: 0;
}

.chat-input-prefix {
  position: absolute;
  right: 76px;
  bottom: 32px;
  left: 36px;
  z-index: 3;
  display: flex;
  width: auto;
  margin-bottom: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.chat-input-controls {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.chat-textarea :deep(.el-textarea__inner) {
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  box-shadow: none;
}

.chat-textarea :deep(.el-textarea__inner:hover) {
  border-color: var(--app-color-brand-hover, var(--app-color-brand));
}

.chat-textarea :deep(.el-textarea__inner:focus),
.chat-textarea :deep(.el-textarea.is-focus .el-textarea__inner) {
  border-color: var(--app-color-brand);
  box-shadow: 0 0 0 2px rgb(0 82 217 / 12%);
}

.chat-textarea :deep(.el-textarea.is-disabled .el-textarea__inner) {
  background-color: var(--app-fill-color-light, #f5f7fa);
}

.sender-setting-btn {
  width: 32px;
  height: 32px;
  padding: 0 !important;
  background: #f8fafc;
  border: 1px solid var(--app-border-color);
  border-radius: 8px;
}

.model-select {
  width: 260px;
  max-width: 100%;
}

.knowledge-base-chip {
  display: inline-flex;
  height: 28px;
  max-width: 320px;
  padding: 0 10px;
  overflow: hidden;
  font-size: 12px;
  font-weight: var(--app-font-weight-medium);
  color: var(--app-color-brand);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgb(0 82 217 / 6%);
  border-radius: 999px;
  align-items: center;
}

.chat-textarea :deep(.el-textarea__inner) {
  min-height: 108px !important;
  padding: 22px 48px 46px 24px;
  font-size: 15px;
  line-height: 1.65;
  color: var(--app-text-primary);
  border-color: var(--app-border-color-deeper);
  border-radius: 12px;
  box-shadow: none;
}

.chat-textarea :deep(.el-textarea__inner:focus) {
  border-color: var(--app-color-brand);
  box-shadow: 0 0 0 3px rgb(0 82 217 / 10%);
}

.chat-sender-footer {
  display: flex;
  height: 0;
  padding: 0 14px 0 0;
  margin-top: 0;
  transform: translateY(-38px);
  align-items: center;
  justify-content: flex-end;
}

.send-circle-btn {
  width: 32px;
  height: 32px;
  margin-left: 0;
  color: #fff;
  background: var(--app-color-brand);
  border: 0;
}

.send-circle-btn.is-disabled,
.send-circle-btn:disabled {
  color: #fff;
  background: #d1d5db;
}

.send-circle-btn.is-stop {
  background: var(--el-color-danger);
}

.chat-loading-mask {
  position: absolute;
  z-index: 10;
  display: flex;
  background: rgb(255 255 255 / 72%);
  inset: 0;
  align-items: center;
  justify-content: center;
}

.file-list-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
}

.file-list-item {
  display: flex;
  height: 32px;
  max-width: 100%;
  min-width: 120px;
  padding: 0 10px 0 8px;
  overflow: hidden;
  font-size: 13px;
  background: var(--app-bg-subtle);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-sm);
  align-items: center;
}

.file-icon {
  margin-right: 8px;
  font-size: 18px;
  color: var(--app-color-brand);
  flex-shrink: 0;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.file-actions {
  display: flex;
  margin-left: 15px;
  align-items: center;
  gap: 8px;
}

.file-action {
  display: flex;
  padding: 0;
  color: var(--app-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 0;
  align-items: center;
}

.rag-markdown {
  max-width: 100%;
  font-size: 15px;
  line-height: 1.7;
  color: var(--app-text-primary);
  word-break: break-word;
}

.rag-markdown.is-user-content {
  color: #667085;
  white-space: pre-wrap;
}

.rag-markdown :deep(table),
.rag-markdown :deep(th),
.rag-markdown :deep(td) {
  border: 1px solid var(--app-border-color);
  border-collapse: collapse;
}

.rag-markdown :deep(table) {
  width: 100%;
  overflow: hidden;
  background: #fff;
}

.rag-markdown :deep(th),
.rag-markdown :deep(td) {
  padding: 6px 12px;
}

.rag-markdown :deep(p) {
  margin: 0 0 6px;
}

.rag-markdown :deep(pre) {
  max-width: 100%;
  padding: 12px;
  overflow: auto;
  color: #f8fafc;
  background: #111827;
  border-radius: 8px;
}

.rag-markdown :deep(.ref-tooltip) {
  position: relative;
  display: inline-flex;
  margin: 0 2px;
  font-size: 12px;
  line-height: 1;
  vertical-align: super;
  cursor: pointer;
  align-items: center;
}

.rag-markdown :deep(.ref-tooltip .ref-index) {
  display: inline-flex;
  height: 18px;
  padding: 0 5px;
  font-weight: var(--app-font-weight-medium);
  color: var(--app-color-brand);
  background: rgb(0 82 217 / 8%);
  border: 1px solid rgb(0 82 217 / 18%);
  border-radius: 999px;
  align-items: center;
}

.rag-markdown :deep(.ref-tooltip .tooltip-content) {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  z-index: 999;
  display: flex;
  width: min(560px, calc(100vw - 48px));
  max-height: 420px;
  padding: 14px;
  color: var(--app-text-primary);
  text-align: left;
  cursor: auto;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(4px);
  box-shadow: var(--app-shadow-sm);
  box-sizing: border-box;
  transition:
    opacity 0.16s ease,
    visibility 0.16s ease,
    transform 0.16s ease;
  align-items: stretch;
  gap: 12px;
}

.rag-markdown :deep(.ref-tooltip:hover .tooltip-content),
.rag-markdown :deep(.ref-tooltip:focus-within .tooltip-content) {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.rag-markdown :deep(.ref-tooltip .tooltip-content .chunk-img) {
  width: 180px;
  max-height: 320px;
  object-fit: cover;
  border-radius: var(--app-radius-md);
  flex-shrink: 0;
}

.rag-markdown :deep(.ref-tooltip .tooltip-content .chunk-info) {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.rag-markdown :deep(.ref-tooltip .tooltip-content .chunk-content) {
  display: block;
  max-height: 320px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.7;
  color: var(--app-text-primary);
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.rag-markdown :deep(.ref-tooltip .tooltip-content .chunk-name) {
  display: block;
  padding-top: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--app-color-brand);
  word-break: break-word;
  border-top: 1px solid var(--app-border-color);
}

.modal {
  position: fixed;
  z-index: 10000;
  display: none;
  overflow: auto;
  background-color: rgb(0 0 0 / 90%);
  inset: 0;
}

.modal-content {
  display: block;
  max-width: 90%;
  max-height: 90%;
  margin: 5% auto;
}

.close {
  position: absolute;
  top: 15px;
  right: 35px;
  font-size: 40px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
}

@media (width <= 768px) {
  .chat-content {
    min-width: 0;
  }

  .chat-box {
    padding: 8px 8px 10px;
  }

  .chat-list {
    gap: 42px;
  }

  .chat-header {
    padding: 0 12px;
  }

  .chat-sender-card {
    padding: 0 10px 12px;
  }

  .chat-input-prefix {
    right: 58px;
    bottom: 24px;
    left: 22px;
  }

  .chat-input-controls {
    width: 100%;
  }

  .chat-textarea :deep(.el-textarea__inner) {
    min-height: 96px !important;
    padding: 18px 44px 42px 18px;
  }

  .model-select {
    width: 100%;
  }

  .knowledge-base-chip {
    max-width: 100%;
  }

  .chat-sender-footer {
    padding-right: 10px;
    align-items: center;
    flex-direction: row;
    justify-content: flex-end;
  }

  .rag-markdown :deep(.ref-tooltip .tooltip-content) {
    width: min(320px, calc(100vw - 32px));
    max-height: 360px;
  }

  .rag-markdown :deep(.ref-tooltip .tooltip-content .chunk-img) {
    display: none;
  }

  .rag-markdown :deep(.ref-tooltip .tooltip-content .chunk-content) {
    max-height: 260px;
  }
}
</style>
