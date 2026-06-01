import request from '@/config/axios'
import { getAccessToken } from '@/utils/auth'

export interface ChatReferenceChunk {
  [key: string]: any
}

export interface ChatHistoryMessage {
  id?: number
  sessionId?: string
  chatId?: string
  msgId?: string
  role?: string
  content?: string
  reasoning?: string
  reference?: ChatReferenceChunk[]
  rawContent?: string
}

export interface ChatCompletionStreamRequest {
  chatId: string
  question: string
  sessionId: string
  datasetIds?: string[]
  enableDeepThink?: boolean
}

export interface ChatStreamEventPayload {
  type: 'start' | 'delta' | 'done' | 'error'
  chatId?: string
  sessionId?: string
  messageId?: string
  role?: string
  question?: string
  delta?: string
  fullAnswer?: string
  reference?: ChatReferenceChunk[]
  message?: string
}

type NormalizeChatAssistantPayloadOptions = {
  preserveEmptyDatasetIds?: boolean
}

function normalizeChatAssistantPayload(
  data: any,
  options: NormalizeChatAssistantPayloadOptions = {}
) {
  const payload = { ...(data || {}) }
  if ('dataset_ids' in payload) {
    const datasetIds = Array.isArray(payload.dataset_ids)
      ? payload.dataset_ids
          .map((item: any) => String(item ?? '').trim())
          .filter(Boolean)
      : []
    if (datasetIds.length || options.preserveEmptyDatasetIds) {
      payload.dataset_ids = datasetIds
    } else {
      delete payload.dataset_ids
    }
  }
  return payload
}

function normalizeDatasetIds(datasetIds?: string[]) {
  if (!Array.isArray(datasetIds)) return []
  return datasetIds
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
}

function buildChatCompletionPayload(params: ChatCompletionStreamRequest) {
  const datasetIds = normalizeDatasetIds(params.datasetIds)
  return {
    question: String(params.question || '').trim(),
    session_id: String(params.sessionId || '').trim(),
    stream: true,
    enable_deep_think: Boolean(params.enableDeepThink),
    dataset_ids: datasetIds
  }
}

function buildChatCompletionFormData(params: ChatCompletionStreamRequest) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(buildChatCompletionPayload(params)))
  return formData
}

async function parseStreamError(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null)
    return {
      payload,
      message: payload?.msg || payload?.message || `请求失败(${response.status})`
    }
  }

  const text = await response.text().catch(() => '')
  return {
    payload: null,
    message: text || `请求失败(${response.status})`
  }
}

async function requestChatCompletionStreamInternal(
  params: ChatCompletionStreamRequest,
  signal?: AbortSignal
): Promise<Response> {
  const headers = new Headers()
  const token = getAccessToken() || document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]
  if (token) {
    headers.set('Authorization', `Bearer ${decodeURIComponent(token)}`)
  }

  const response = await fetch(
    `/admin-api/ragflow/session/completions/${params.sessionId}`,
    {
      method: 'POST',
      body: buildChatCompletionFormData(params),
      headers,
      signal
    }
  )

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.msg || payload?.message || `请求失败(${response.status})`)
  }

  if (response.ok && response.body) {
    return response
  }

  const { message } = await parseStreamError(response)
  throw new Error(message)
}

export function createChatAssistant(data: any) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(normalizeChatAssistantPayload(data)))
  return request.post({
    url: '/ragflow/chatAssistant/create',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateChatAssistant(chatId: string, data: any) {
  const formData = new FormData()
  formData.append(
    'json',
    JSON.stringify(
      normalizeChatAssistantPayload(data, { preserveEmptyDatasetIds: true })
    )
  )
  return request.post({
    url: `/ragflow/chatAssistant/update/${chatId}`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function listChatAssistants(
  params: {
    page?: number
    page_size?: number
    orderby?: string
    desc?: boolean
    chat_name?: string
    chat_id?: string
  } = {}
) {
  return request.get({
    url: '/ragflow/chatAssistant/list',
    params
  })
}

export type DeleteAllChatAssistantsParams = {
  chatType: string
  datasetId?: string
}

export function deleteAllChatAssistants(params: DeleteAllChatAssistantsParams) {
  return request.delete({
    url: '/ragflow/chatAssistant/delete-chat',
    params
  })
}

export function createSession(chatId: string, data: any) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(data))
  return request.post({
    url: `/ragflow/session/create/${chatId}`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateSession(chatId: string, sessionId: string, data: any) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(data))
  return request.post({
    url: `/ragflow/session/update/${chatId}/${sessionId}`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function listSessions(chatId: string, params: any = {}) {
  return request.get({
    url: `/ragflow/session/list/${chatId}`,
    params
  })
}

export function listHistoryMessage(chatId: string, sessionId: string) {
  return request.get({
    url: `/ragflow/session/chat_history/${chatId}/${sessionId}`,
  }) as Promise<{ code: number; data: ChatHistoryMessage[]; msg?: string }>
}

export function deleteSessions(chatId: string, ids: string) {
  return request.post({
    url: `/ragflow/session/delete/${chatId}`,
    params: { ids }
  })
}

export function requestChatCompletionStream(
  params: ChatCompletionStreamRequest,
  signal?: AbortSignal
) {
  return requestChatCompletionStreamInternal(params, signal)
}
