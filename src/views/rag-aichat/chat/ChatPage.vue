<template>
  <div class="chat-page-shell">
    <el-container class="chat-container">
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
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import type {
  ChatHistoryMessage,
  ChatReferenceChunk,
  ChatStreamEventPayload
} from '@/api/rag-aichat/chat'
import {
  createChatAssistant,
  createSession,
  deleteAllChatAssistants,
  deleteSessions,
  listHistoryMessage,
  listSessions,
  updateChatAssistant,
  updateSession
} from '@/api/rag-aichat/chat'
import {
  getKnowledgeBaseListByMe,
  getKnowledgeBaseListInvite
} from '@/api/rag-aichat/knowledgeBase'
import { useChatStream } from '../hooks/useChatStream'
import ChatPanel from './components/ChatPanel.vue'
import ChatSessionList from './components/ChatSessionList.vue'

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
  reference: ChatReferenceChunk[]
  rawContent: string
}

type SendPayload = {
  question: string
  datasetIds?: string[]
  replay?: boolean
}

const GENERAL_CHAT_SCENE = 'GENERAL_CHAT'
const KB_CHAT_SCENE = 'KB_CHAT'
const DEFAULT_SESSION_NAME = '新的会话'
const SESSION_NAME_MAX_LENGTH = 24
const knowledgeBaseStorageKey = 'selectedKnowledgeBaseIds'
const legacyKnowledgeBaseStorageKey = 'selectedKnowledgeBaseId'

const props = defineProps({
  inputType: { type: String, default: 'sender' },
  fixedDatasetId: { type: [String, Number], default: '' },
  fixedKnowledgeBaseLabel: { type: String, default: '' },
  useRouteDatasetId: { type: Boolean, default: true },
  showKnowledgeBaseSelector: { type: Boolean, default: true },
  hideSessionList: { type: Boolean, default: false },
  allowSessionSidebarToggle: { type: Boolean, default: true },
  sessionSidebarVisible: { type: Boolean, default: undefined }
})

const route = useRoute()
const { isStreamActive, sendChatStream, stopStream } = useChatStream()

const resolvedDatasetId = computed(
  () => props.fixedDatasetId || (props.useRouteDatasetId ? route.params.id : '') || ''
)
const assistantScene = computed(() => (resolvedDatasetId.value ? KB_CHAT_SCENE : GENERAL_CHAT_SCENE))
const resetChatAssistantParams = computed(() => {
  const params: { chatType: string; datasetId?: string } = {
    chatType: assistantScene.value
  }
  if (assistantScene.value === KB_CHAT_SCENE && resolvedDatasetId.value) {
    params.datasetId = String(resolvedDatasetId.value)
  }
  return params
})
const resetSessionConfirmBody = computed(() =>
  assistantScene.value === KB_CHAT_SCENE
    ? '重置后会删除当前知识库对应的聊天助手和历史会话，且无法恢复。是否继续？'
    : '重置后会删除当前普通聊天助手和历史会话，且无法恢复。是否继续？'
)
const hideSessionList = computed(() => props.hideSessionList)
const isMobile = computed(() => windowWidth.value <= 768)
const activeSessionStreaming = computed(() => isSessionStreaming(activeSessionId.value))
const activeSessionTitle = computed(() => {
  const currentSession = sessionList.value.find((item) => item.id === activeSessionId.value)
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
  if (currentKnowledgeBases.length > 1) return `已选择 ${currentKnowledgeBases.length} 个知识库`
  if (activeSessionTitle.value === DEFAULT_SESSION_NAME) return 'AI问答'
  return activeSessionTitle.value || 'AI问答'
})

const chatAssistantId = ref('')
const activeSessionId = ref('')
const sessionList = ref<SessionRecord[]>([])
const currentMessages = ref<UiChatMessage[]>([])
const sessionMessageCache = ref<Record<string, UiChatMessage[]>>({})
const knowledgeBaseOptions = ref<any[]>([])
const selectedKnowledgeBaseIds = ref<string[]>([])
const canCreateSession = ref(true)
const loading = ref(false)
const resettingSession = ref(false)
const isSidebarCollapsed = ref(false)
const showSessionDrawer = ref(false)
const initSeq = ref(0)
const windowWidth = ref(window.innerWidth)
const autoNamingSessionIds = new Set<string>()

const showRequestError = (error: any, fallback: string) => {
  const message = error?.msg || error?.message || error?.response?.data?.msg || fallback
  ElMessage.error(message)
}

const normalizeKnowledgeBaseIds = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }
  if (value === null || value === undefined) return []
  return [String(value).trim()].filter(Boolean)
}

const normalizeReferenceList = (reference: any): ChatReferenceChunk[] => {
  if (Array.isArray(reference)) return reference
  if (Array.isArray(reference?.chunks)) return reference.chunks
  return []
}

const buildStreamKey = (sessionId: string) => `${chatAssistantId.value || 'chat'}:${String(sessionId || '')}`

const isSessionStreaming = (sessionId: string) =>
  Boolean(sessionId && isStreamActive(buildStreamKey(sessionId)))

const splitAssistantMessage = (rawContent: any) => {
  const text = String(rawContent ?? '')
  const match = text.match(/<think>([\s\S]*?)<\/think>/)
  return {
    reasoning: match ? match[1] : '',
    content: text.replace(/<think>[\s\S]*?<\/think>/g, '')
  }
}

const resolveStreamRawContent = (
  payload: ChatStreamEventPayload,
  currentRawContent: string
) => {
  if (typeof payload.fullAnswer === 'string' && payload.fullAnswer.length > 0) {
    return payload.fullAnswer
  }
  if (typeof payload.delta === 'string' && payload.delta.length > 0) {
    return `${currentRawContent || ''}${payload.delta}`
  }
  return currentRawContent || ''
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

const hasPairedUserQuestion = (messages: UiChatMessage[], index: number) =>
  messages[index - 1]?.role === 'user'

const mergeHistoryIntoMessages = (
  messages: UiChatMessage[],
  histories: ChatHistoryMessage[] = []
) => {
  if (!histories.length) return messages

  const historyMap = new Map<string, ChatHistoryMessage>()
  histories.forEach((item) => {
    const key = String(item.msgId || item.id || '').trim()
    if (key) historyMap.set(key, item)
  })

  const assistantHistories = histories
    .filter((item) => String(item.role || 'assistant') === 'assistant')
    .slice()
  let assistantIndex = 0
  const usedHistories = new Set<ChatHistoryMessage>()

  return messages.map((message, index) => {
    if (message.role !== 'assistant') return message
    if (!hasPairedUserQuestion(messages, index)) return message

    let matchedHistory = (message.id && historyMap.get(String(message.id))) || undefined
    if (matchedHistory) usedHistories.add(matchedHistory)

    while (!matchedHistory && assistantIndex < assistantHistories.length) {
      const candidate = assistantHistories[assistantIndex++]
      if (usedHistories.has(candidate)) continue
      matchedHistory = candidate
      usedHistories.add(candidate)
    }

    if (!matchedHistory) return message
    const rawContent = matchedHistory.rawContent || message.rawContent
    const splitResult = splitAssistantMessage(rawContent)
    return {
      ...message,
      id: message.id || String(matchedHistory.msgId || ''),
      rawContent,
      content: matchedHistory.content ?? message.content ?? splitResult.content,
      reasoning: matchedHistory.reasoning ?? message.reasoning ?? splitResult.reasoning,
      reference:
        normalizeReferenceList(matchedHistory.reference).length > 0
          ? normalizeReferenceList(matchedHistory.reference)
          : message.reference
    }
  })
}

const persistKnowledgeBaseIds = (ids: string[]) => {
  localStorage.setItem(knowledgeBaseStorageKey, JSON.stringify(ids))
  localStorage.setItem(legacyKnowledgeBaseStorageKey, ids[0] || '')
}

const areKnowledgeBaseIdsEqual = (left: string[] = [], right: string[] = []) =>
  left.length === right.length && left.every((id, index) => id === right[index])

const saveChatAssistantKnowledgeBases = async (knowledgeBaseIds: string[]) => {
  if (!chatAssistantId.value) return
  await updateChatAssistant(chatAssistantId.value, {
    scene: assistantScene.value,
    dataset_ids: knowledgeBaseIds
  })
}

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
    if (!dedupedMap.has(item.value)) dedupedMap.set(item.value, item)
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

const trimSessionName = (value: any) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const extractQuestionTitle = (value: any) =>
  String(value ?? '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_>#]+/g, ' ')
    .replace(/(^|\s)-+\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const truncateSessionName = (value: string, max = SESSION_NAME_MAX_LENGTH) =>
  value.length <= max ? value : `${value.slice(0, max).trim()}...`

const summarizeQuestionTitle = (value: string) => {
  const normalized = extractQuestionTitle(value)
  if (!normalized) return ''
  return normalized
    .split(/[。！？!?；;，,\n]/)
    .map((item) => trimSessionName(item))
    .find(Boolean) || normalized
}

const buildSessionNameFromQuestion = (question: string) => {
  const summary = summarizeQuestionTitle(question)
  if (!summary) return DEFAULT_SESSION_NAME
  return truncateSessionName(summary)
}

const getSessionById = (sessionId: string) =>
  sessionList.value.find((session) => session.id === sessionId)

const hasCachedSessionMessages = (sessionId: string) =>
  Object.prototype.hasOwnProperty.call(sessionMessageCache.value, sessionId)

const getSessionMessages = (sessionId: string) => {
  if (!sessionId) return []
  if (hasCachedSessionMessages(sessionId)) return sessionMessageCache.value[sessionId] || []
  if (sessionId === activeSessionId.value) return currentMessages.value
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
  if (activeSessionId.value === sessionId) currentMessages.value = nextMessages
}

const updateSessionMessages = (
  sessionId: string,
  updater: (messages: UiChatMessage[]) => UiChatMessage[]
) => {
  setSessionMessages(sessionId, updater(getSessionMessages(sessionId)))
}

const removeSessionMessages = (sessionId: string) => {
  const nextCache = { ...sessionMessageCache.value }
  delete nextCache[sessionId]
  sessionMessageCache.value = nextCache
  if (activeSessionId.value === sessionId) currentMessages.value = []
}

const isUntitledSession = (session: any) => {
  const name = trimSessionName(session?.name)
  return !name || name === DEFAULT_SESSION_NAME
}

const hasSessionMessages = (sessionId: string) => {
  if (!sessionId) return false
  if (getSessionMessages(sessionId).length > 0) return true
  if (sessionId === activeSessionId.value) return currentMessages.value.length > 0
  const session = getSessionById(sessionId)
  return Array.isArray(session?.messages) && session.messages.length > 0
}

const shouldReplaceEmptySession = (sessionId: string) => {
  const session = getSessionById(sessionId)
  return Boolean(
    sessionId && !isSessionStreaming(sessionId) && isUntitledSession(session) && !hasSessionMessages(sessionId)
  )
}

const setLocalSessionName = (sessionId: string, name: string) => {
  const session = getSessionById(sessionId)
  if (session) session.name = name
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
    showRequestError(error, '会话名称更新失败')
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

const fetchAssistantHistory = async (
  chatId: string,
  sessionId: string,
  messages: UiChatMessage[]
) => {
  if (!messages.some((item) => item.role === 'assistant')) return messages
  try {
    const response = await listHistoryMessage(chatId, sessionId)
    if (Array.isArray(response?.data)) return mergeHistoryIntoMessages(messages, response.data)
  } catch {
    // 历史增强失败时保留基础消息，避免会话切换卡住
  }
  return messages
}

const buildMessagesFromSessionRecord = async (
  chatId: string,
  sessionId: string,
  session?: SessionRecord
) => {
  const baseMessages = buildUiMessagesFromSession(session?.messages || [])
  return fetchAssistantHistory(chatId, sessionId, baseMessages)
}

const resolveSessionList = (response: any) => {
  if (Array.isArray(response)) return response
  const data = response?.data || response
  if (Array.isArray(data)) return data
  return data?.list || data?.items || []
}

const refreshSessionMessages = async (chatId: string, sessionId: string) => {
  const response = await listSessions(chatId)
  const sessions = resolveSessionList(response)
  sessionList.value = sessions
  const session = sessions.find((item: SessionRecord) => item.id === sessionId)
  if (!session) {
    removeSessionMessages(sessionId)
    return []
  }
  const messages = await buildMessagesFromSessionRecord(chatId, sessionId, session)
  setSessionMessages(sessionId, messages)
  return messages
}

const applySessionState = async (
  chatId: string,
  sessions: SessionRecord[] = [],
  sessionId?: string
) => {
  sessionList.value = sessions || []
  if (!sessionList.value.length) {
    activeSessionId.value = ''
    currentMessages.value = []
    return
  }

  const targetSessionId =
    (sessionId && sessionList.value.find((session) => session.id === sessionId)?.id) ||
    sessionList.value[0].id
  activeSessionId.value = targetSessionId
  const currentSession = sessionList.value.find((session) => session.id === targetSessionId)
  if (hasCachedSessionMessages(targetSessionId) && isSessionStreaming(targetSessionId)) {
    currentMessages.value = getSessionMessages(targetSessionId)
    return
  }
  const messages = await buildMessagesFromSessionRecord(chatId, targetSessionId, currentSession)
  setSessionMessages(targetSessionId, messages)
}

const fetchSessions = async (chatId: string, sessionId?: string) => {
  const response = await listSessions(chatId)
  await applySessionState(chatId, resolveSessionList(response), sessionId)
}

const resetChatState = () => {
  stopStream()
  chatAssistantId.value = ''
  activeSessionId.value = ''
  sessionList.value = []
  currentMessages.value = []
  sessionMessageCache.value = {}
}

const stopActiveStream = () => {
  if (!activeSessionId.value) return
  stopStream(buildStreamKey(activeSessionId.value))
}

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
}

function toggleSidebar() {
  if (hideSessionList.value) return
  if (isMobile.value) {
    showSessionDrawer.value = !showSessionDrawer.value
    return
  }
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

function setSidebarVisible(visible: boolean) {
  if (hideSessionList.value) return
  if (isMobile.value) {
    showSessionDrawer.value = visible
    return
  }
  isSidebarCollapsed.value = !visible
}

const newSession = async () => {
  if (!chatAssistantId.value || resettingSession.value) return
  loading.value = true
  try {
    const currentSessionId = activeSessionId.value
    if (shouldReplaceEmptySession(currentSessionId)) {
      try {
        await deleteSessions(chatAssistantId.value, currentSessionId)
      } catch {
        // 删除空会话失败时不阻塞新会话创建
      }
    }

    const previousIds = new Set(sessionList.value.map((item) => item.id))
    const createResponse = await createSession(chatAssistantId.value, {
      name: DEFAULT_SESSION_NAME
    })
    const createdSessionId =
      createResponse?.data?.id ||
      createResponse?.id ||
      createResponse?.data?.session_id ||
      createResponse?.session_id ||
      ''
    const sessionResponse = await listSessions(chatAssistantId.value)
    const nextSessions = resolveSessionList(sessionResponse)
    const inferredSessionId =
      createdSessionId ||
      nextSessions.find((item: SessionRecord) => !previousIds.has(item.id))?.id ||
      nextSessions[0]?.id ||
      ''
    await applySessionState(chatAssistantId.value, nextSessions, inferredSessionId)
    if (isMobile.value) showSessionDrawer.value = false
  } finally {
    loading.value = false
  }
}

const resetAllSessions = async () => {
  if (resettingSession.value) return
  try {
    await ElMessageBox.confirm(resetSessionConfirmBody.value, '重置会话', {
      type: 'warning',
      confirmButtonText: '确认重置',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  const nextKnowledgeBaseIds = selectedKnowledgeBaseIds.value.slice()
  resettingSession.value = true
  loading.value = true
  try {
    await deleteAllChatAssistants(resetChatAssistantParams.value)
    resetChatState()
    await initChatByKnowledgeBase(nextKnowledgeBaseIds)
    ElMessage.success('会话已重置')
    if (isMobile.value) showSessionDrawer.value = false
  } catch (error) {
    showRequestError(error, '重置会话失败')
  } finally {
    loading.value = false
    resettingSession.value = false
  }
}

const deleteSession = async (sessionId: string) => {
  if (!chatAssistantId.value || resettingSession.value) return
  stopStream(buildStreamKey(sessionId))
  removeSessionMessages(sessionId)
  loading.value = true
  try {
    const preservedSessionId = activeSessionId.value === sessionId ? undefined : activeSessionId.value
    await deleteSessions(chatAssistantId.value, sessionId)
    await fetchSessions(chatAssistantId.value, preservedSessionId)
    if (sessionList.value.length === 0) await newSession()
  } finally {
    loading.value = false
  }
}

const switchSession = async (session: SessionRecord) => {
  if (resettingSession.value) return
  const targetSessionId = String(session?.id || '')
  if (!targetSessionId) return
  const localMessages = getSessionMessages(targetSessionId)
  activeSessionId.value = targetSessionId
  if (localMessages.length || isSessionStreaming(targetSessionId)) currentMessages.value = localMessages
  loading.value = !localMessages.length && !isSessionStreaming(targetSessionId)
  try {
    await fetchSessions(chatAssistantId.value, targetSessionId)
  } finally {
    loading.value = false
  }
  if (isMobile.value) showSessionDrawer.value = false
}

const renameSession = async ({ sessionId, name }: { sessionId: string; name: string }) => {
  try {
    await syncSessionName(sessionId, name)
  } catch {
    // syncSessionName 已提示
  }
}

const resolveListResponse = (response: any) => {
  const data = response?.data || response
  return data?.list || data?.items || data || []
}

const initChatByKnowledgeBase = async (knowledgeBaseIds: string[]) => {
  const normalizedIds = normalizeKnowledgeBaseIds(knowledgeBaseIds)
  selectedKnowledgeBaseIds.value = normalizedIds
  if (!resolvedDatasetId.value) persistKnowledgeBaseIds(normalizedIds)

  const createPayload: Record<string, any> = {
    scene: assistantScene.value,
    name: null
  }
  if (normalizedIds.length) createPayload.dataset_ids = normalizedIds

  const chatResponse = await createChatAssistant(createPayload)
  chatAssistantId.value = String(
    chatResponse?.data?.id ||
      chatResponse?.data?.chatId ||
      chatResponse?.id ||
      chatResponse?.chatId ||
      ''
  )
  if (!chatAssistantId.value) return
  await fetchSessions(chatAssistantId.value)
  if (sessionList.value.length === 0) {
    await createSession(chatAssistantId.value, { name: DEFAULT_SESSION_NAME })
    await fetchSessions(chatAssistantId.value)
  }
}

const resetChatByKnowledgeBase = async (knowledgeBaseIds: string[]) => {
  const normalizedIds = normalizeKnowledgeBaseIds(knowledgeBaseIds)
  const previousIds = selectedKnowledgeBaseIds.value.slice()
  const hasChanged = !areKnowledgeBaseIdsEqual(previousIds, normalizedIds)
  selectedKnowledgeBaseIds.value = normalizedIds
  if (!resolvedDatasetId.value) persistKnowledgeBaseIds(normalizedIds)
  if (!hasChanged) return

  try {
    await saveChatAssistantKnowledgeBases(normalizedIds)
  } catch (error) {
    selectedKnowledgeBaseIds.value = previousIds
    if (!resolvedDatasetId.value) persistKnowledgeBaseIds(previousIds)
    showRequestError(error, '知识库设置保存失败')
  }
}

const initializeChat = async () => {
  const currentSeq = ++initSeq.value
  loading.value = true
  resetChatState()
  try {
    const [personalRes, campusRes] = await Promise.all([
      getKnowledgeBaseListByMe({}),
      getKnowledgeBaseListInvite({})
    ])
    const knowledgeBases = mergeKnowledgeBaseOptions(
      resolveListResponse(personalRes),
      resolveListResponse(campusRes)
    )
    const datasetId = resolvedDatasetId.value
    if (currentSeq !== initSeq.value) return

    if (datasetId) {
      const matchedKnowledgeBase = knowledgeBases.find((item) => item.value === String(datasetId))
      if (!matchedKnowledgeBase) {
        ElMessage.warning('未找到对应知识库')
        canCreateSession.value = false
        knowledgeBaseOptions.value = props.fixedKnowledgeBaseLabel
          ? [
              {
                label: props.fixedKnowledgeBaseLabel,
                shortLabel: props.fixedKnowledgeBaseLabel,
                value: String(datasetId)
              }
            ]
          : []
        selectedKnowledgeBaseIds.value = [String(datasetId)]
        return
      }
      if (matchedKnowledgeBase.disabled) {
        ElMessage.warning('当前知识库未解析或文档数为0，暂不可用')
        knowledgeBaseOptions.value = [
          {
            ...matchedKnowledgeBase,
            label: props.fixedKnowledgeBaseLabel || matchedKnowledgeBase.label,
            shortLabel: props.fixedKnowledgeBaseLabel || matchedKnowledgeBase.shortLabel
          }
        ]
        canCreateSession.value = false
        selectedKnowledgeBaseIds.value = []
        return
      }
      knowledgeBaseOptions.value = [
        {
          ...matchedKnowledgeBase,
          label: props.fixedKnowledgeBaseLabel || matchedKnowledgeBase.label,
          shortLabel: props.fixedKnowledgeBaseLabel || matchedKnowledgeBase.shortLabel
        }
      ]
      canCreateSession.value = true
      selectedKnowledgeBaseIds.value = [String(datasetId)]
      await initChatByKnowledgeBase(selectedKnowledgeBaseIds.value)
      return
    }

    knowledgeBaseOptions.value = knowledgeBases
    canCreateSession.value = true
    if (!knowledgeBases.length) {
      selectedKnowledgeBaseIds.value = []
      localStorage.removeItem(knowledgeBaseStorageKey)
      localStorage.removeItem(legacyKnowledgeBaseStorageKey)
      await initChatByKnowledgeBase([])
      return
    }

    selectedKnowledgeBaseIds.value = resolveInitialKnowledgeBaseIds(knowledgeBases)
    persistKnowledgeBaseIds(selectedKnowledgeBaseIds.value)
    await initChatByKnowledgeBase(selectedKnowledgeBaseIds.value)
  } catch (error) {
    canCreateSession.value = false
    showRequestError(error, '初始化失败')
  } finally {
    if (currentSeq === initSeq.value) loading.value = false
  }
}

const handleSend = async (payload: SendPayload) => {
  if (resettingSession.value) return
  const question = String(payload?.question || '').trim()
  if (!question) return
  if (!chatAssistantId.value || !activeSessionId.value) {
    ElMessage.warning('新会话初始化中，请稍候再试')
    return
  }

  const sessionId = String(activeSessionId.value)
  if (isSessionStreaming(sessionId)) return
  const datasetIds = normalizeKnowledgeBaseIds(payload?.datasetIds ?? selectedKnowledgeBaseIds.value)

  if (!payload?.replay) {
    try {
      await autoRenameSession(sessionId, question)
    } catch {
      // 自动重命名失败不阻塞提问
    }
  }

  const assistantLocalId = `assistant-${sessionId}-${Date.now()}`
  const userMessage = createUiMessage({
    localId: `user-${sessionId}-${Date.now()}`,
    role: 'user',
    content: question,
    rawContent: question
  })
  const assistantMessage = createUiMessage({
    localId: assistantLocalId,
    role: 'assistant',
    content: '',
    rawContent: '',
    reference: []
  })

  setSessionMessages(sessionId, [...getSessionMessages(sessionId), userMessage, assistantMessage])

  const updateStreamingAssistantMessage = (patch: Partial<UiChatMessage>) => {
    Object.assign(assistantMessage, patch)
    updateSessionMessages(sessionId, (messages) =>
      messages.map((message) => {
        const isCurrentStreamingMessage =
          message.role === 'assistant' && message.localId === assistantLocalId
        if (!isCurrentStreamingMessage) return message
        return { ...message, ...patch }
      })
    )
  }

  const applyAssistantStreamPayload = (streamPayload: ChatStreamEventPayload) => {
    const rawContent = resolveStreamRawContent(streamPayload, assistantMessage.rawContent)
    const splitResult = splitAssistantMessage(rawContent)
    const references = normalizeReferenceList(streamPayload.reference)
    updateStreamingAssistantMessage({
      id: streamPayload.messageId || assistantMessage.id,
      rawContent,
      content: splitResult.content,
      reasoning: splitResult.reasoning,
      reference: references.length > 0 ? references : assistantMessage.reference
    })
  }

  let completed = false
  let hasError = false

  await sendChatStream(
    {
      chatId: chatAssistantId.value,
      sessionId,
      question,
      datasetIds
    },
    {
      onStart(streamPayload) {
        updateStreamingAssistantMessage({
          id: streamPayload.messageId || assistantMessage.id
        })
      },
      onDelta(streamPayload) {
        applyAssistantStreamPayload(streamPayload)
      },
      onDone(streamPayload) {
        completed = true
        applyAssistantStreamPayload(streamPayload)
      },
      onAbort() {
        if (!assistantMessage.content && !assistantMessage.reasoning) {
          updateStreamingAssistantMessage({ content: '【回答已中止】' })
        }
      },
      onError(streamPayload) {
        hasError = true
        const message = streamPayload.message || '回答失败，请稍后重试'
        if (!assistantMessage.content && !assistantMessage.reasoning) {
          updateStreamingAssistantMessage({ content: `发生错误：${message}` })
        }
        ElMessage.error(message)
      }
    },
    {
      streamKey: buildStreamKey(sessionId)
    }
  )

  if (completed && !hasError && chatAssistantId.value) {
    await refreshSessionMessages(chatAssistantId.value, sessionId)
  }
}

watch(
  () => resolvedDatasetId.value,
  () => {
    initializeChat()
  },
  { immediate: true }
)

watch(
  () => props.sessionSidebarVisible,
  (visible) => {
    if (typeof visible !== 'boolean' || hideSessionList.value) return
    setSidebarVisible(visible)
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('resize', updateWindowWidth)
  const token = route.query.token
  if (token) localStorage.setItem('token', token as string)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
  stopActiveStream()
})

defineExpose({
  newSession,
  toggleHistoryPanel: () => {
    if (hideSessionList.value) return
    if (isMobile.value) {
      showSessionDrawer.value = !showSessionDrawer.value
      return
    }
    toggleSidebar()
  },
  openHistoryPanel: () => {
    setSidebarVisible(true)
  },
  closeHistoryPanel: () => {
    setSidebarVisible(false)
  },
  setHistoryPanelVisible: setSidebarVisible
})
</script>

<style scoped>
.chat-page-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--app-bg-page);
}

.chat-container {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  box-shadow: none;
  flex-direction: row;
}

:deep(.el-drawer__body) {
  padding: 0;
  background: #fff;
}
</style>
