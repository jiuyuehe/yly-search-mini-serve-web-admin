import request from '@/config/axios'
import { config } from '@/config/axios/config'
import { getAccessToken } from '@/utils/auth'
import { fetchEventSource } from '@microsoft/fetch-event-source'

const BASE_URL = '/rag/ai/text/file-chat'

const buildUserHeaders = (userId?: number): Record<string, string> => {
  const headers: Record<string, string> = {}
  if (userId) {
    headers['X-User-Id'] = String(userId)
  }
  return headers
}

const sendStream = async ({
  path,
  data,
  userId,
  ctrl,
  onMessage,
  onError,
  onClose
}: {
  path: string
  data: Record<string, any>
  userId?: number
  ctrl: AbortController
  onMessage?: (res: any) => void
  onError?: (...args: any[]) => void
  onClose?: (...args: any[]) => void
}) => {
  const token = getAccessToken()
  return fetchEventSource(`${config.base_url}${path}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...buildUserHeaders(userId)
    },
    openWhenHidden: true,
    body: JSON.stringify(data),
    onmessage: onMessage,
    onerror: onError,
    onclose: onClose,
    signal: ctrl.signal
  })
}

export interface RagChatSessionCreateReqVO {
  userId?: number
  title?: string
  esId?: string
  roleId?: number
  modelId?: number
  temperature?: number
  maxTokens?: number
  maxContexts?: number
  userPrompt?: string
  returnHistory?: boolean
  newSession?: boolean
}

export interface RagChatMessageSimpleVO {
  id: number
  type: 'user' | 'assistant' | string
  content: string
  useContext?: boolean
  segmentRefs?: string
  createTime?: string
}

export interface RagChatSessionVO {
  id: number
  userId?: number
  title?: string
  esId?: string
  roleId?: number
  modelId?: number
  model?: string
  systemMessage?: string
  userPrompt?: string
  temperature?: number
  maxTokens?: number
  maxContexts?: number
  pinned?: boolean
  pinnedTime?: string
  lastActivityTime?: string
  messageCount?: number
  createTime?: string
  updateTime?: string
  history?: RagChatMessageSimpleVO[]
}

export interface RagChatSessionUpdateReqVO {
  userId?: number
  sessionId: number
  modelId?: number
  temperature?: number
  maxTokens?: number
  maxContexts?: number
  userPrompt?: string
}

export interface RagFileChatMessageSendReqVO {
  sessionId: number
  esId?: string
  content: string
  useContext?: boolean
  topK?: number
  maxContextChars?: number
}

export interface RagEnhancedChatReqVO {
  sessionId: number
  content: string
  esId: string
  useContext?: boolean
  topK?: number
  similarityThreshold?: number
  enableHybridSearch?: boolean
  maxContextChars?: number
  enableQueryRewriting?: boolean
  enableReranking?: boolean
}

export interface DocumentChunkPolicyReqVO {
  baseChunkTokens?: number
  overlapTokens?: number
  sectionTargetTokens?: number
  sectionGroupSize?: number
}

export interface DocumentVectorizationReqVO {
  userId?: number
  esId: string
  forceReprocess?: boolean
  chunkSize?: number
}

export interface DocumentVectorizationReqV2 {
  userId?: number
  esId: string
  embeddingModelId?: number
  rerankModelId?: number
  forceReindex?: boolean
  chunkPolicy?: DocumentChunkPolicyReqVO
}

export interface DocumentVectorizationRespVO {
  esId: string
  status: string
  message?: string
  totalChars?: number
  chunkCount?: number
  baseChunkCount?: number
  sectionChunkCount?: number
  vectorDimension?: number
  embeddingModelId?: number
  rerankModelId?: number
  vectorIndexName?: string
  chunkPolicy?: string
  startTime?: string
  endTime?: string
  processingTimeMs?: number
}

export interface VectorStatusRespVO {
  esId: string
  isVectorized?: boolean
  status?: string
  statusMessage?: string
  totalChars?: number
  chunkCount?: number
  baseChunkCount?: number
  sectionChunkCount?: number
  vectorDimension?: number
  embeddingModelId?: number
  rerankModelId?: number
  vectorIndexName?: string
  chunkPolicy?: string
  lastUpdated?: string
  completedAt?: string
  processingTimeMs?: number
}

export interface DocumentRagAskReqVO {
  sessionId: number
  esId: string
  question: string
  mode?: 'AUTO' | 'LOCATE' | 'FACT_QA' | 'SUMMARY' | 'TRANSLATE' | 'THEME_COMPARE'
  useContext?: boolean
  targetLang?: string
  toolMode?: 'AUTO' | 'ON' | 'OFF'
  maxCitations?: number
  topK?: number
}

export interface FileChatReferenceVO {
  esId: string
  id: string
  score?: number
  type?: string
  startOffset?: number
  endOffset?: number
  preview?: string
}

export interface RetrievedChunkRespVO {
  id: string
  chunkLevel?: string
  startOffset?: number
  endOffset?: number
  preview?: string
  sourceSignals?: string[]
  scoreDetail?: Record<string, number>
}

export interface RagStreamChunkVO {
  sessionId?: number
  partType: 'meta' | 'delta' | 'final' | 'error' | 'indexing' | string
  content?: string
  references?: FileChatReferenceVO[]
  retrievals?: RetrievedChunkRespVO[]
  mergedSystem?: string
  userPrompt?: string
}

export const DocumentRagApi = {
  createSession: async (data: RagChatSessionCreateReqVO, userId?: number) => {
    return await request.post<RagChatSessionVO>({
      url: `${BASE_URL}/session/create`,
      data,
      headers: buildUserHeaders(userId)
    })
  },

  getSessionLatest: async (
    params: { userId?: number; esId?: string; returnHistory?: boolean },
    userId?: number
  ) => {
    return await request.get<RagChatSessionVO>({
      url: `${BASE_URL}/session/latest`,
      params,
      headers: buildUserHeaders(userId)
    })
  },

  getSessionDetail: async (sessionId: number, returnHistory = true, userId?: number) => {
    return await request.get<RagChatSessionVO>({
      url: `${BASE_URL}/session/detail`,
      params: { sessionId, returnHistory },
      headers: buildUserHeaders(userId)
    })
  },

  getSessionList: async (params: { userId?: number; esId?: string }, userId?: number) => {
    return await request.get<RagChatSessionVO[]>({
      url: `${BASE_URL}/session/list`,
      params,
      headers: buildUserHeaders(userId)
    })
  },

  getSessionPage: async (
    params: { userId?: number; esId?: string; pageNo: number; pageSize: number },
    userId?: number
  ) => {
    return await request.get<PageResult<RagChatSessionVO[]>>({
      url: `${BASE_URL}/session/page`,
      params,
      headers: buildUserHeaders(userId)
    })
  },

  renameSession: async (sessionId: number, title: string, userId?: number) => {
    return await request.post<boolean>({
      url: `${BASE_URL}/session/rename`,
      params: { sessionId, title, userId },
      headers: buildUserHeaders(userId)
    })
  },

  pinSession: async (sessionId: number, pinned: boolean, userId?: number) => {
    return await request.post<boolean>({
      url: `${BASE_URL}/session/pin`,
      params: { sessionId, pinned, userId },
      headers: buildUserHeaders(userId)
    })
  },

  updateSessionUserPrompt: async (sessionId: number, userPrompt: string, userId?: number) => {
    return await request.post<boolean>({
      url: `${BASE_URL}/session/update-user-prompt`,
      params: { sessionId, userPrompt, userId },
      headers: buildUserHeaders(userId)
    })
  },

  updateSessionModelParams: async (data: RagChatSessionUpdateReqVO, userId?: number) => {
    return await request.post<boolean>({
      url: `${BASE_URL}/session/update`,
      data,
      headers: buildUserHeaders(userId)
    })
  },

  deleteSession: async (sessionId: number, userId?: number) => {
    return await request.delete<boolean>({
      url: `${BASE_URL}/session/delete`,
      params: { sessionId, userId },
      headers: buildUserHeaders(userId)
    })
  },

  clearSessions: async (esId?: string, userId?: number) => {
    return await request.delete<boolean>({
      url: `${BASE_URL}/session/clear`,
      params: { esId, userId },
      headers: buildUserHeaders(userId)
    })
  },

  clearSessionHistory: async (sessionId: number, userId?: number) => {
    return await request.delete<boolean>({
      url: `${BASE_URL}/session/clear-history`,
      params: { sessionId, userId },
      headers: buildUserHeaders(userId)
    })
  },

  deleteMessage: async (messageId: number, userId?: number) => {
    return await request.delete<boolean>({
      url: `${BASE_URL}/message/delete`,
      params: { messageId, userId },
      headers: buildUserHeaders(userId)
    })
  },

  vectorizeDocument: async (data: DocumentVectorizationReqVO, userId?: number) => {
    return await request.post<DocumentVectorizationRespVO>({
      url: `${BASE_URL}/vectorize-doc`,
      data,
      headers: buildUserHeaders(userId)
    })
  },

  vectorizeDocumentV2: async (data: DocumentVectorizationReqV2, userId?: number) => {
    return await request.post<DocumentVectorizationRespVO>({
      url: `${BASE_URL}/vectorize-doc-v2`,
      data,
      headers: buildUserHeaders(userId)
    })
  },

  checkVectorStatus: async (esId: string, embeddingModelId?: number, userId?: number) => {
    return await request.get<VectorStatusRespVO>({
      url: `${BASE_URL}/check-vector-status`,
      params: { esId, embeddingModelId },
      headers: buildUserHeaders(userId)
    })
  },

  streamDocumentRag: async ({
    data,
    userId,
    ctrl,
    onMessage,
    onError,
    onClose
  }: {
    data: DocumentRagAskReqVO
    userId?: number
    ctrl: AbortController
    onMessage?: (res: any) => void
    onError?: (...args: any[]) => void
    onClose?: (...args: any[]) => void
  }) => {
    return await sendStream({
      path: `${BASE_URL}/stream-document-rag`,
      data,
      userId,
      ctrl,
      onMessage,
      onError,
      onClose
    })
  },

  streamRag: async ({
    data,
    userId,
    ctrl,
    onMessage,
    onError,
    onClose
  }: {
    data: RagFileChatMessageSendReqVO
    userId?: number
    ctrl: AbortController
    onMessage?: (res: any) => void
    onError?: (...args: any[]) => void
    onClose?: (...args: any[]) => void
  }) => {
    return await sendStream({
      path: `${BASE_URL}/stream-rag`,
      data,
      userId,
      ctrl,
      onMessage,
      onError,
      onClose
    })
  },

  streamEnhancedRag: async ({
    data,
    userId,
    ctrl,
    onMessage,
    onError,
    onClose
  }: {
    data: RagEnhancedChatReqVO
    userId?: number
    ctrl: AbortController
    onMessage?: (res: any) => void
    onError?: (...args: any[]) => void
    onClose?: (...args: any[]) => void
  }) => {
    return await sendStream({
      path: `${BASE_URL}/stream-enhanced-rag`,
      data,
      userId,
      ctrl,
      onMessage,
      onError,
      onClose
    })
  }
}
