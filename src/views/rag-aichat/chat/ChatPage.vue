<template>
  <el-container class="rag-chat-page">
    <ChatSessionList
      v-if="!hideSessionList && !isMobile"
      :session-list="sessionList"
      :active-session-id="activeSessionId"
      :can-create-session="canCreateSession && !resettingSession"
      :can-reset-session="canCreateSession && !!chatAssistantId && !loading"
      :resetting-session="resettingSession"
      :collapsed="isSidebarCollapsed"
      :show-toggle-controls="props.allowSessionSidebarToggle"
      @new-session="newSession"
      @reset-session="resetAllSessions"
      @switch-session="switchSession"
      @delete-session="deleteSession"
      @rename-session="renameSession"
      @collapse="toggleSidebar"
    />

    <el-container class="rag-chat-main">
      <el-header class="rag-chat-main-header">
        <div class="text-18px font-bold truncate">
          {{ panelTitle }}
          <span v-if="currentMessages.length">({{ currentMessages.length }})</span>
        </div>
        <div v-if="activeSession" class="flex items-center gap-8px">
          <el-button type="primary" plain size="small" @click="openPromptDialog">
            <el-icon class="mr-5px"><Setting /></el-icon>
            {{ assistantLabel }}
          </el-button>
          <el-button size="small" @click="handlerMessageClear">
            <el-icon><Delete /></el-icon>
          </el-button>
          <el-button size="small" @click="handleGoTopMessage">
            <el-icon><Top /></el-icon>
          </el-button>
        </div>
      </el-header>

      <el-main class="rag-chat-message-area">
        <div class="rag-chat-message-shell">
          <div v-if="!activeSession" class="rag-chat-empty-state">
            <el-empty description="暂无会话，点击左侧“新的会话”开始提问" />
          </div>

          <template v-else>
            <div v-if="activeMessageListLoading" class="rag-chat-loading">
              <el-skeleton :rows="6" animated />
            </div>

            <div v-else-if="!currentMessages.length" class="rag-chat-empty-state">
              <el-empty description="当前会话暂无消息" />
            </div>

            <div v-else class="rag-chat-message-list" ref="messageListRef" @scroll="handleMessageScroll">
              <div
                v-for="(item, index) in currentMessages"
                :key="getMessageKey(item, index)"
                class="rag-chat-message-row"
                :class="item.role"
              >
                <el-avatar :size="34" :src="item.role === 'user' ? userAvatar : aiAvatar" />
                <div class="rag-chat-message-card">
                  <div class="rag-chat-message-meta">
                    <span>{{ item.role === 'user' ? '用户' : '助手' }}</span>
                  </div>
                  <div v-if="item.reasoning" class="rag-chat-reasoning">
                    <el-collapse>
                      <el-collapse-item title="思考过程" name="reasoning">
                        <MarkdownView :content="item.reasoning" />
                      </el-collapse-item>
                    </el-collapse>
                  </div>
                  <MarkdownView v-if="item.content" :content="item.content" />
                  <div v-else-if="activeSessionStreaming && item.role === 'assistant'" class="flex items-center text-#667085">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span class="ml-5px">思考中...</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </el-main>

      <el-footer class="rag-chat-footer">
        <ChatPanel
          :session-id="activeSessionId"
          :chat-id="chatAssistantId"
          :title="panelTitle"
          :messages="currentMessages"
          :input-type="resolvedDatasetId ? 'input' : props.inputType"
          :show-knowledge-base-selector="props.showKnowledgeBaseSelector"
          :knowledge-base-options="knowledgeBaseOptions"
          :selected-knowledge-base-ids="selectedKnowledgeBaseIds"
          :assistant-scene="assistantScene"
          :loading="loading"
          :streaming="activeSessionStreaming"
          @send="handleSend"
          @stop="stopActiveStream"
          @knowledge-base-change="resetChatByKnowledgeBase"
          @show-session-drawer="showSessionDrawer = true"
        />
      </el-footer>
    </el-container>

    <el-drawer
      v-if="!hideSessionList && isMobile"
      v-model="showSessionDrawer"
      direction="ltr"
      size="280px"
      :with-header="false"
    >
      <ChatSessionList
        :session-list="sessionList"
        :active-session-id="activeSessionId"
        :can-create-session="canCreateSession && !resettingSession"
        :can-reset-session="canCreateSession && !!chatAssistantId && !loading"
        :resetting-session="resettingSession"
        :collapsed="false"
        :show-toggle-controls="props.allowSessionSidebarToggle"
        @switch-session="switchSession"
        @delete-session="deleteSession"
        @new-session="newSession"
        @reset-session="resetAllSessions"
        @rename-session="renameSession"
        @collapse="() => (showSessionDrawer = false)"
      />
    </el-drawer>

    <PromptSettingDialog
      v-model:visible="showPromptDialog"
      :knowledge-base="currentKnowledgeBases"
      :chat-id="chatAssistantId"
      :assistant-scene="assistantScene"
    />
    <ModelSettingDialog
      v-model:visible="showModelDialog"
      :knowledge-base="currentKnowledgeBases"
      :chat-id="chatAssistantId"
      :assistant-scene="assistantScene"
    />
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Loading, Setting, Top } from '@element-plus/icons-vue'

import MarkdownView from '@/components/MarkdownView/index.vue'
import userAvatar from '@/assets/imgs/avatar.jpg'
import aiAvatar from '@/assets/imgs/avatar.gif'

import ChatPanel from '../components/ChatPanel.vue'
import ChatSessionList from '../components/ChatSessionList.vue'
import PromptSettingDialog from '../components/PromptSettingDialog.vue'
import ModelSettingDialog from '../components/ModelSettingDialog.vue'
import { useChatStream } from '../hooks/useChatStream'
import { getKnowledgeBaseListByMe, getKnowledgeBaseListInvite } from '@/api/rag-aichat/knowledgeBase'
import {
  createChatAssistant,
  createSession,
  deleteAllChatAssistants,
  deleteSessions,
  listChatAssistants,
  listHistoryMessage,
  listSessions,
  updateChatAssistant,
  updateSession
} from '@/api/rag-aichat/chat'

defineOptions({ name: 'RagAiChatPage' })

type SessionRecord = {
  id: string
  name?: string
  messages?: any[]
  [key: string]: any
}

type UiChatMessage = {
  id?: string
  localId?: string
  role: 'user' | 'assistant' | 'system' | 'error'
  content: string
  reasoning: string
  reference: any[]
  rawContent: string
}

const props = defineProps({
  inputType: { type: String, default: 'sender' },
  fixedDatasetId: { type: [String, Number], default: '' },
  fixedKnowledgeBaseLabel: { type: String, default: '' },
  useRouteDatasetId: { type: Boolean, default: true },
  showKnowledgeBaseSelector: { type: Boolean, default: true },
  hideSessionList: { type: Boolean, default: false },
  allowSessionSidebarToggle: { type: Boolean, default: true }
})

const DEFAULT_SESSION_NAME = '新的会话'
const SESSION_NAME_MAX_LENGTH = 24
const knowledgeBaseStorageKey = 'selectedKnowledgeBaseIds'
const legacyKnowledgeBaseStorageKey = 'selectedKnowledgeBaseId'
const GENERAL_CHAT_SCENE = 'GENERAL_CHAT'
const KB_CHAT_SCENE = 'KB_CHAT'

const route = useRoute()
const { isStreamActive, sendChatStream, stopStream } = useChatStream()

const resolvedDatasetId = computed(
  () =>
    props.fixedDatasetId ||
    (props.useRouteDatasetId ? route.params.id : '') ||
    ''
)
const assistantScene = computed(() =>
  resolvedDatasetId.value ? KB_CHAT_SCENE : GENERAL_CHAT_SCENE
)
const assistantLabel = computed(() => (assistantScene.value === KB_CHAT_SCENE ? '知识库设置' : '助手设置'))
const activeSessionStreaming = computed(() =>
  isSessionStreaming(activeSessionId.value)
)
const activeSession = computed(() =>
  sessionList.value.find((item) => item.id === activeSessionId.value) || null
)
const activeSessionTitle = computed(() => {
  const currentSession = sessionList.value.find(
    (item) => item.id === activeSessionId.value
  )
  return trimSessionName(currentSession?.name) || DEFAULT_SESSION_NAME
})
const panelTitle = computed(() => {
  if (props.fixedKnowledgeBaseLabel) return props.fixedKnowledgeBaseLabel
  const currentKnowledgeBases = knowledgeBaseOptions.value.filter((item) =>
    selectedKnowledgeBaseIds.value.includes(item.value)
  )
  if (currentKnowledgeBases.length === 1) {
    return currentKnowledgeBases[0]?.shortLabel || currentKnowledgeBases[0]?.label || activeSessionTitle.value || 'AI问答'
  }
  if (currentKnowledgeBases.length > 1) {
    return `已选择 ${currentKnowledgeBases.length} 个知识库`
  }
  if (activeSessionTitle.value === DEFAULT_SESSION_NAME) {
    return 'AI问答'
  }
  return activeSessionTitle.value || 'AI问答'
})
const canCreateSession = computed(() => Boolean(chatAssistantId.value))
const isMobile = computed(() => windowWidth.value <= 768)
const currentKnowledgeBases = computed(() => {
  if (!selectedKnowledgeBaseIds.value.length) return []
  return knowledgeBaseOptions.value.filter((item) =>
    selectedKnowledgeBaseIds.value.includes(item.value)
  )
})

const chatAssistantId = ref('')
const activeSessionId = ref('')
const sessionList = ref<SessionRecord[]>([])
const currentMessages = ref<UiChatMessage[]>([])
const sessionMessageCache = ref<Record<string, UiChatMessage[]>>({})
const knowledgeBaseOptions = ref<any[]>([])
const selectedKnowledgeBaseIds = ref<string[]>([])
const loading = ref(false)
const resettingSession = ref(false)
const isSidebarCollapsed = ref(false)
const showSessionDrawer = ref(false)
const showPromptDialog = ref(false)
const showModelDialog = ref(false)
const initSeq = ref(0)
const windowWidth = ref(window.innerWidth)
const autoNamingSessionIds = new Set<string>()
const messageListRef = ref<HTMLElement | null>(null)

const normalizeKnowledgeBaseIds = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }
  if (value === null || value === undefined) return []
  return [String(value).trim()].filter(Boolean)
}

const splitAssistantMessage = (rawContent: any) => {
  const text = String(rawContent ?? '')
  const match = text.match(/<think>([\s\S]*?)<\/think>/)
  return {
    reasoning: match ? match[1] : '',
    content: text.replace(/<think>[\s\S]*?<\/think>/g, '')
  }
}

const normalizeReferenceList = (reference: any): any[] => {
  if (Array.isArray(reference)) return reference
  if (Array.isArray(reference?.chunks)) return reference.chunks
  return []
}

const createUiMessage = (payload: Partial<UiChatMessage> & { role: UiChatMessage['role'] }) => {
  const rawContent = String(payload.rawContent ?? payload.content ?? '')
  if (payload.role === 'assistant') {
    const splitResult = splitAssistantMessage(rawContent)
    return {
      id: payload.id || '',
      localId: payload.localId,
      role: payload.role,
      content: payload.content ?? splitResult.content,
      reasoning: payload.reasoning ?? splitResult.reasoning,
      reference: normalizeReferenceList(payload.reference),
      rawContent
    } as UiChatMessage
  }

  return {
    id: payload.id || '',
    localId: payload.localId,
    role: payload.role,
    content: String(payload.content ?? ''),
    reasoning: '',
    reference: [],
    rawContent
  } as UiChatMessage
}

const buildUiMessagesFromSession = (messages: any[] = []) =>
  (messages || [])
    .map((message) =>
      createUiMessage({
        id: String(message?.id ?? message?.msg_id ?? message?.messageId ?? message?.msgId ?? ''),
        role: message?.role || 'assistant',
        content: message?.content || '',
        rawContent: message?.content || '',
        reference: message?.reference
      })
    )
    .reverse()

const getSessionById = (sessionId: string) =>
  sessionList.value.find((session) => session.id === sessionId)

const hasCachedSessionMessages = (sessionId: string) =>
  Object.prototype.hasOwnProperty.call(sessionMessageCache.value, sessionId)

const getSessionMessages = (sessionId: string) => {
  if (!sessionId) return []
  if (hasCachedSessionMessages(sessionId)) {
    return sessionMessageCache.value[sessionId] || []
  }
  if (sessionId === activeSessionId.value) {
    return currentMessages.value
  }
  const session = getSessionById(sessionId)
  return buildUiMessagesFromSession(session?.messages || [])
}

const setSessionMessages = (sessionId: string, messages: UiChatMessage[]) => {
  if (!sessionId) return
  const nextMessages = messages || []
  sessionMessageCache.value = {
    ...sessionMessageCache.value,
    [sessionId]: nextMessages
  }
  if (activeSessionId.value === sessionId) {
    currentMessages.value = nextMessages
  }
}

const updateSessionMessages = (
  sessionId: string,
  updater: (messages: UiChatMessage[]) => UiChatMessage[]
) => {
  setSessionMessages(sessionId, updater(getSessionMessages(sessionId)))
}

const setLocalSessionName = (sessionId: string, name: string) => {
  const session = getSessionById(sessionId)
  if (session) {
    session.name = name
  }
}

const trimSessionName = (value: any) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const truncateSessionName = (value: string, max = SESSION_NAME_MAX_LENGTH) =>
  value.length <= max ? value : `${value.slice(0, max).trim()}...`

const summarizeQuestionTitle = (value: string) => {
  const normalized = String(value ?? '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_>#]+/g, ' ')
    .replace(/(^|\s)-+\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return ''
  return (
    normalized
      .split(/[。！？!?；;，,\n]/)
      .map((item) => trimSessionName(item))
      .find(Boolean) || normalized
  )
}

const buildSessionNameFromQuestion = (question: string) => {
  const summary = summarizeQuestionTitle(question)
  if (!summary) return DEFAULT_SESSION_NAME
  return truncateSessionName(summary)
}

const isUntitledSession = (session: any) => {
  const name = trimSessionName(session?.name)
  return !name || name === DEFAULT_SESSION_NAME
}

const syncSessionName = async (sessionId: string, name: string) => {
  if (!chatAssistantId.value || !sessionId) return
  const nextName = trimSessionName(name) || DEFAULT_SESSION_NAME
  const session = getSessionById(sessionId)
  const previousName = trimSessionName(session?.name) || DEFAULT_SESSION_NAME
  if (previousName === nextName) return

  setLocalSessionName(sessionId, nextName)
  try {
    await updateSession(chatAssistantId.value, sessionId, { name: nextName })
  } catch (error) {
    setLocalSessionName(sessionId, previousName)
    throw error
  }
}

const autoRenameSession = async (sessionId: string, question: string) => {
  if (!sessionId || autoNamingSessionIds.has(sessionId)) return
  const session = getSessionById(sessionId)
  if (!isUntitledSession(session)) return
  const generatedName = buildSessionNameFromQuestion(question)
  if (!generatedName || generatedName === DEFAULT_SESSION_NAME) return

  autoNamingSessionIds.add(sessionId)
  try {
    await syncSessionName(sessionId, generatedName)
  } finally {
    autoNamingSessionIds.delete(sessionId)
  }
}

const isSessionStreaming = (sessionId: string) =>
  Boolean(sessionId && isStreamActive(`${chatAssistantId.value || 'chat'}:${String(sessionId || '')}`))

const buildStreamKey = (sessionId: string) =>
  `${chatAssistantId.value || 'chat'}:${String(sessionId || '')}`

const persistKnowledgeBaseIds = (ids: string[]) => {
  localStorage.setItem(knowledgeBaseStorageKey, JSON.stringify(ids))
  localStorage.setItem(legacyKnowledgeBaseStorageKey, ids[0] || '')
}

const areKnowledgeBaseIdsEqual = (left: string[] = [], right: string[] = []) =>
  left.length === right.length && left.every((id, index) => id === right[index])

const normalizeKnowledgeBaseOptions = (list: any[] = [], group: 'personal' | 'campus') => {
  const groupLabel = group === 'personal' ? '个人知识库' : '共享知识库'
  return list.map((item: any) => {
    const chunkCount = Number(item.chunk_count ?? 0)
    const documentCount = Number(item.document_count ?? 0)
    const disabled = chunkCount <= 0 || documentCount <= 0
    const disabledLabel = disabled ? '（未解析或文档数为0）' : ''
    return {
      label: `${groupLabel} · ${item.name}${disabledLabel}`,
      shortLabel: item.name,
      name: item.name,
      value: String(item.id),
      group,
      groupLabel,
      disabled,
      chunkCount,
      documentCount,
      raw: item
    }
  })
}

const mergeKnowledgeBaseOptions = (personalList: any[] = [], campusList: any[] = []) => {
  const merged = [
    ...normalizeKnowledgeBaseOptions(personalList, 'personal'),
    ...normalizeKnowledgeBaseOptions(campusList, 'campus')
  ]
  const dedupedMap = new Map<string, any>()
  merged.forEach((item) => {
    if (!dedupedMap.has(item.value)) {
      dedupedMap.set(item.value, item)
    }
  })
  return Array.from(dedupedMap.values())
}

const resolveInitialKnowledgeBaseIds = (options: any[]) => {
  if (!options.length) return []

  const availableIds = new Set(options.filter((item) => !item.disabled).map((item) => item.value))
  let storedIds: string[] = []

  const raw = localStorage.getItem(knowledgeBaseStorageKey)
  if (raw) {
    try {
      storedIds = normalizeKnowledgeBaseIds(JSON.parse(raw))
    } catch {
      storedIds = normalizeKnowledgeBaseIds(raw)
    }
  }

  if (!storedIds.length) {
    storedIds = normalizeKnowledgeBaseIds(localStorage.getItem(legacyKnowledgeBaseStorageKey) || '')
  }

  const matchedIds = storedIds.filter((id) => availableIds.has(id))
  return matchedIds.length ? matchedIds : []
}

const syncKnowledgeBaseSelection = async (ids: string[]) => {
  if (!chatAssistantId.value) return
  const uniqueIds = Array.from(new Set(ids))
  selectedKnowledgeBaseIds.value = uniqueIds
  persistKnowledgeBaseIds(uniqueIds)
  await updateChatAssistant(chatAssistantId.value, {
    scene: assistantScene.value,
    dataset_ids: uniqueIds
  })
}

const loadKnowledgeBases = async () => {
  const [myRes, inviteRes] = await Promise.allSettled([
    getKnowledgeBaseListByMe({}),
    getKnowledgeBaseListInvite({})
  ])
  const resolveListResponse = (result: PromiseSettledResult<any>) => {
    if (result.status !== 'fulfilled') return []
    const data = result.value?.data || result.value
    return data?.list || data?.items || data || []
  }
  const personalList = resolveListResponse(myRes)
  const campusList = resolveListResponse(inviteRes)
  knowledgeBaseOptions.value = mergeKnowledgeBaseOptions(personalList, campusList)
  const initialIds = resolveInitialKnowledgeBaseIds(knowledgeBaseOptions.value)
  if (!selectedKnowledgeBaseIds.value.length && initialIds.length) {
    selectedKnowledgeBaseIds.value = initialIds
  }
}

const ensureAssistant = async () => {
  let items: any[] = []
  try {
    const res = await listChatAssistants({ chat_id: resolvedDatasetId.value ? String(resolvedDatasetId.value) : undefined })
    items = res.data || res.items || []
  } catch {
    // 未找到助手，将自动创建
  }
  const current = items.find((item: any) => String(item?.scene || '') === assistantScene.value) || items[0]
  if (current?.chatId || current?.id) {
    chatAssistantId.value = String(current.chatId || current.id)
    if (Array.isArray(current.dataset_ids) && !selectedKnowledgeBaseIds.value.length) {
      selectedKnowledgeBaseIds.value = current.dataset_ids.map((item: any) => String(item))
    }
    return
  }

  const created = await createChatAssistant({
    scene: assistantScene.value,
    dataset_ids: selectedKnowledgeBaseIds.value,
    name: assistantScene.value === KB_CHAT_SCENE ? '知识库问答' : 'AI问答'
  })
  chatAssistantId.value = String(created.data?.chatId || created.data?.id || created.chatId || created.id || '')
}

const loadSessions = async () => {
  if (!chatAssistantId.value) return
  const res = await listSessions(chatAssistantId.value)
  const items = res.data || res.list || []
  sessionList.value = Array.isArray(items) ? items : []
  if (activeSessionId.value && !sessionList.value.some((item) => item.id === activeSessionId.value)) {
    activeSessionId.value = ''
    currentMessages.value = []
  }
}

const fetchSessionHistory = async (sessionId: string) => {
  if (!chatAssistantId.value || !sessionId) return []
  const res = await listHistoryMessage(chatAssistantId.value, sessionId)
  return res.data || []
}

const loadSessionMessages = async (sessionId: string) => {
  if (!sessionId) return
  const history = await fetchSessionHistory(sessionId)
  const messages = buildUiMessagesFromSession(history)
  setSessionMessages(sessionId, messages)
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const openPromptDialog = () => {
  showPromptDialog.value = true
}

const handleMessageScroll = () => {
  const wrap = messageListRef.value
  if (!wrap) return
}

const getMessageKey = (item: UiChatMessage, index: number) =>
  [String(activeSessionId.value || ''), item.localId || item.id || '', item.role, index].join(':')

const handleGoTopMessage = () => {
  const wrap = messageListRef.value
  if (wrap) wrap.scrollTop = 0
}

const stopActiveStream = () => {
  stopStream(buildStreamKey(activeSessionId.value))
}

const resetChatByKnowledgeBase = async (ids: string[]) => {
  if (!props.showKnowledgeBaseSelector) return
  if (!areKnowledgeBaseIdsEqual(ids, selectedKnowledgeBaseIds.value)) {
    try {
      await syncKnowledgeBaseSelection(ids)
    } catch (error) {
      console.error(error)
      ElMessage.error('知识库设置更新失败')
    }
  }
}

const handleSend = async (payload: { question: string; datasetIds?: string[]; replay?: boolean }) => {
  if (!chatAssistantId.value) {
    ElMessage.warning('聊天助手尚未初始化')
    return
  }

  let sessionId = activeSessionId.value
  if (!sessionId) {
    sessionId = await newSession()
  }
  if (!sessionId) return

  const userMessage: UiChatMessage = createUiMessage({
    role: 'user',
    content: payload.question,
    rawContent: payload.question,
    localId: `user-${Date.now()}`
  })
  const assistantMessage: UiChatMessage = createUiMessage({
    role: 'assistant',
    content: '',
    rawContent: '',
    localId: `assistant-${Date.now()}`
  })

  updateSessionMessages(sessionId, (messages) => [...messages, userMessage, assistantMessage])

  await sendChatStream(
    {
      chatId: chatAssistantId.value,
      question: payload.question,
      sessionId,
      datasetIds: payload.datasetIds || selectedKnowledgeBaseIds.value
    },
    {
      onDelta: (streamPayload) => {
        updateSessionMessages(sessionId, (messages) => {
          const next = [...messages]
          const index = next.findIndex((item) => item.localId === assistantMessage.localId)
          if (index >= 0) {
            const current = next[index]
            const nextContent = String(streamPayload.fullAnswer || `${current.rawContent || ''}${streamPayload.delta || ''}`)
            const splitResult = splitAssistantMessage(nextContent)
            next[index] = {
              ...current,
              rawContent: nextContent,
              content: splitResult.content,
              reasoning: splitResult.reasoning,
              reference: normalizeReferenceList(streamPayload.reference) || current.reference
            }
          }
          return next
        })
      },
      onDone: async (streamPayload) => {
        updateSessionMessages(sessionId, (messages) => {
          const next = [...messages]
          const index = next.findIndex((item) => item.localId === assistantMessage.localId)
          if (index >= 0) {
            const current = next[index]
            const nextContent = String(streamPayload.fullAnswer || current.rawContent || current.content || '')
            const splitResult = splitAssistantMessage(nextContent)
            next[index] = {
              ...current,
              rawContent: nextContent,
              content: splitResult.content,
              reasoning: splitResult.reasoning,
              reference: normalizeReferenceList(streamPayload.reference) || current.reference
            }
          }
          return next
        })
        await autoRenameSession(sessionId, payload.question)
        await loadSessions()
      },
      onError: (streamPayload) => {
        updateSessionMessages(sessionId, (messages) => {
          const next = [...messages]
          const index = next.findIndex((item) => item.localId === assistantMessage.localId)
          if (index >= 0) {
            next[index] = {
              ...next[index],
              content: streamPayload.message || '回复失败',
              rawContent: streamPayload.message || '回复失败'
            }
          }
          return next
        })
        ElMessage.error(streamPayload.message || '发送失败')
      }
    },
    { streamKey: buildStreamKey(sessionId) }
  )
}

const handleConversationClick = async (session: SessionRecord) => {
  if (activeSessionStreaming.value) {
    ElMessage.warning('对话中，不允许切换')
    return false
  }
  activeSessionId.value = String(session.id)
  currentMessages.value = getSessionMessages(activeSessionId.value)
  await loadSessionMessages(activeSessionId.value)
  currentMessages.value = getSessionMessages(activeSessionId.value)
  showSessionDrawer.value = false
  return true
}

const switchSession = async (session: SessionRecord) => handleConversationClick(session)

const handlerMessageClear = async () => {
  if (!activeSessionId.value || !chatAssistantId.value) return
  try {
    await ElMessageBox.confirm('确定要清空当前会话吗？', '清空会话', { type: 'warning' })
  } catch {
    return
  }

  try {
    const currentSessionId = activeSessionId.value
    await deleteSessions(chatAssistantId.value, String(currentSessionId))
    sessionList.value = sessionList.value.filter((item) => item.id !== currentSessionId)
    sessionMessageCache.value = {
      ...sessionMessageCache.value,
      [currentSessionId]: []
    }
    activeSessionId.value = ''
    currentMessages.value = []
    await newSession()
    ElMessage.success('已清空')
  } catch (error) {
    console.error(error)
    ElMessage.error('清空失败')
  }
}

const openNewSession = async () => {
  if (!chatAssistantId.value) return ''
  const created = await createSession(chatAssistantId.value, { name: DEFAULT_SESSION_NAME })
  const sessionId = String(created.data?.id || created.id || created.sessionId || '')
  if (sessionId) {
    sessionList.value = [
      {
        id: sessionId,
        name: DEFAULT_SESSION_NAME
      },
      ...sessionList.value
    ]
    activeSessionId.value = sessionId
    currentMessages.value = []
  }
  return sessionId
}

const newSession = async () => {
  if (activeSessionStreaming.value) return ''
  const sessionId = await openNewSession()
  showSessionDrawer.value = false
  return sessionId
}

const resetAllSessions = async () => {
  if (!chatAssistantId.value) return
  try {
    await ElMessageBox.confirm('重置后会删除当前聊天助手和历史会话，且无法恢复。是否继续？', '重置会话', {
      type: 'warning'
    })
  } catch {
    return
  }

  resettingSession.value = true
  try {
    await deleteAllChatAssistants({
      chatType: assistantScene.value,
      datasetId: resolvedDatasetId.value ? String(resolvedDatasetId.value) : undefined
    })
    chatAssistantId.value = ''
    sessionList.value = []
    activeSessionId.value = ''
    currentMessages.value = []
    await initPage()
    ElMessage.success('重置成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('重置失败')
  } finally {
    resettingSession.value = false
  }
}

const deleteSession = async (sessionId: string) => {
  if (!chatAssistantId.value || !sessionId) return
  try {
    await ElMessageBox.confirm('确定要删除这个会话吗？', '删除会话', { type: 'warning' })
  } catch {
    return
  }

  try {
    await deleteSessions(chatAssistantId.value, String(sessionId))
    sessionList.value = sessionList.value.filter((item) => item.id !== sessionId)
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = ''
      currentMessages.value = []
    }
    ElMessage.success('删除成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

const renameSession = async ({ sessionId, name }: { sessionId: string; name: string }) => {
  if (!chatAssistantId.value || !sessionId) return
  try {
    await syncSessionName(sessionId, name)
    await loadSessions()
    ElMessage.success('重命名成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('重命名失败')
  }
}

const activeMessageListLoading = ref(false)

const initPage = async () => {
  const currentInitSeq = ++initSeq.value
  loading.value = true
  try {
    await loadKnowledgeBases()
    await ensureAssistant()
    if (currentInitSeq !== initSeq.value) return
    await loadSessions()
    if (!activeSessionId.value && sessionList.value.length) {
      activeSessionId.value = sessionList.value[0].id
      await loadSessionMessages(activeSessionId.value)
      currentMessages.value = getSessionMessages(activeSessionId.value)
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('初始化失败')
  } finally {
    loading.value = false
  }
}

const handleWindowResize = () => {
  windowWidth.value = window.innerWidth
}

const handlePromptDialogEvent = () => {
  showPromptDialog.value = true
}

const handleModelDialogEvent = () => {
  showModelDialog.value = true
}

watch(
  () => activeSessionId.value,
  async (sessionId) => {
    if (!sessionId) return
    activeMessageListLoading.value = true
    try {
      await loadSessionMessages(sessionId)
      currentMessages.value = getSessionMessages(sessionId)
    } finally {
      activeMessageListLoading.value = false
    }
  }
)

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('rag-aichat-open-prompt-dialog', handlePromptDialogEvent as EventListener)
  window.addEventListener('rag-aichat-open-model-dialog', handleModelDialogEvent as EventListener)
  initPage()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('rag-aichat-open-prompt-dialog', handlePromptDialogEvent as EventListener)
  window.removeEventListener('rag-aichat-open-model-dialog', handleModelDialogEvent as EventListener)
  stopActiveStream()
})
</script>

<style scoped>
.rag-chat-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--app-bg-page);
}

.rag-chat-main {
  min-width: 0;
  background: #fff;
}

.rag-chat-main-header {
  display: flex;
  background: var(--app-bg-subtle);
  border-bottom: 1px solid var(--app-border-color);
  align-items: center;
  justify-content: space-between;
}

.rag-chat-message-area {
  padding: 0;
  overflow: hidden;
}

.rag-chat-message-shell {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.rag-chat-message-list {
  display: flex;
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  flex-direction: column;
  gap: 16px;
}

.rag-chat-message-row {
  display: flex;
  gap: 12px;
}

.rag-chat-message-row.user {
  flex-direction: row-reverse;
}

.rag-chat-message-card {
  max-width: min(820px, calc(100% - 60px));
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  box-shadow: var(--app-shadow-xs);
}

.rag-chat-message-row.user .rag-chat-message-card {
  background: rgb(0 82 217 / 6%);
  border-color: rgb(0 82 217 / 12%);
}

.rag-chat-message-meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.rag-chat-footer {
  padding: 0;
  background: #fff;
}

.rag-chat-empty-state,
.rag-chat-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
}
</style>
