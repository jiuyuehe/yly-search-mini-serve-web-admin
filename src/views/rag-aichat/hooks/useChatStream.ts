import { computed, ref, shallowRef } from 'vue'

import {
  requestChatCompletionStream,
  type ChatCompletionStreamRequest,
  type ChatStreamEventPayload
} from '@/api/rag-aichat/chat'

type ParsedSseEvent = {
  event: string
  data: string
}

type SendChatStreamHandlers = {
  onStart?: (payload: ChatStreamEventPayload) => void
  onDelta?: (payload: ChatStreamEventPayload) => void
  onDone?: (payload: ChatStreamEventPayload) => void
  onError?: (payload: ChatStreamEventPayload) => void
  onAbort?: () => void
}

type SendChatStreamOptions = {
  streamKey?: string
}

const DEFAULT_STREAM_KEY = '__default__'

function parseSseBlock(block: string): ParsedSseEvent | null {
  const dataLines: string[] = []
  let eventName = 'message'

  for (const line of block.split(/\r?\n/)) {
    if (!line.trim()) continue
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() || 'message'
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (!dataLines.length) return null

  return {
    event: eventName,
    data: dataLines.join('\n')
  }
}

function toChatStreamPayload(chunk: ParsedSseEvent): ChatStreamEventPayload | null {
  if (!chunk.data || chunk.data === '[DONE]') {
    return null
  }

  const payload = JSON.parse(chunk.data)
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const nextPayload: ChatStreamEventPayload = {
    ...payload,
    type: payload.type || chunk.event || 'delta'
  }

  if (Array.isArray(nextPayload.reference)) {
    nextPayload.reference = nextPayload.reference
  } else {
    nextPayload.reference = []
  }

  return nextPayload
}

function resolveStreamError(error: unknown) {
  if (error instanceof Error) {
    return error.message || '流式响应异常'
  }
  return '流式响应异常'
}

export function useChatStream() {
  const activeStreamKeys = ref<Set<string>>(new Set())
  const abortControllers = shallowRef<Map<string, AbortController>>(new Map())
  const isStreaming = computed(() => activeStreamKeys.value.size > 0)

  const setStreamActive = (streamKey: string, active: boolean) => {
    const nextKeys = new Set(activeStreamKeys.value)
    if (active) {
      nextKeys.add(streamKey)
    } else {
      nextKeys.delete(streamKey)
    }
    activeStreamKeys.value = nextKeys
  }

  const isStreamActive = (streamKey = DEFAULT_STREAM_KEY) =>
    activeStreamKeys.value.has(streamKey)

  const stopStream = (streamKey?: string) => {
    if (streamKey) {
      abortControllers.value.get(streamKey)?.abort()
      return
    }
    abortControllers.value.forEach((controller) => controller.abort())
  }

  const sendChatStream = async (
    params: ChatCompletionStreamRequest,
    handlers: SendChatStreamHandlers = {},
    options: SendChatStreamOptions = {}
  ) => {
    const streamKey = options.streamKey || DEFAULT_STREAM_KEY
    stopStream(streamKey)

    const controller = new AbortController()
    abortControllers.value = new Map(abortControllers.value).set(
      streamKey,
      controller
  )
    setStreamActive(streamKey, true)

    try {
      const response = await requestChatCompletionStream(
        params,
        controller.signal
      )

      if (!response.body) {
        throw new Error('未获取到流式响应')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          const parsedBlock = parseSseBlock(block)
          if (!parsedBlock) continue

          const payload = toChatStreamPayload(parsedBlock)
          if (!payload) continue

          if (payload.type === 'start') {
            handlers.onStart?.(payload)
            continue
          }
          if (payload.type === 'delta') {
            handlers.onDelta?.(payload)
            continue
          }
          if (payload.type === 'done') {
            handlers.onDone?.(payload)
            continue
          }
          if (payload.type === 'error') {
            handlers.onError?.(payload)
            continue
          }
        }
      }

      if (buffer.trim()) {
        const parsedBlock = parseSseBlock(buffer)
        if (parsedBlock) {
          const payload = toChatStreamPayload(parsedBlock)
          if (payload?.type === 'done') {
            handlers.onDone?.(payload)
          } else if (payload?.type === 'error') {
            handlers.onError?.(payload)
          } else if (payload?.type === 'delta') {
            handlers.onDelta?.(payload)
          }
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        handlers.onAbort?.()
        return
      }

      handlers.onError?.({
        type: 'error',
        message: resolveStreamError(error)
      })
    } finally {
      const currentController = abortControllers.value.get(streamKey)
      if (currentController === controller) {
        const nextControllers = new Map(abortControllers.value)
        nextControllers.delete(streamKey)
        abortControllers.value = nextControllers
        setStreamActive(streamKey, false)
      }
    }
  }

  return {
    isStreaming,
    isStreamActive,
    sendChatStream,
    stopStream
  }
}
