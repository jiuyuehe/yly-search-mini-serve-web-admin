import request from '@/config/axios'

export interface AudioAsrStartReqVO {
  esId: string
  modelId?: number
  language?: string
  chunkSeconds?: number
  overwrite?: boolean
  enableSilenceDetect?: boolean
  organizeText?: boolean
  summaryModelId?: number
}

export interface AudioAsrSummaryReqVO {
  esId: string
  modelId?: number
  targetLength?: number
  language?: string
  chunkSize?: number
  concurrency?: number
}

export interface AudioTtsReqVO {
  text: string
  modelId?: number
  voice?: string
  responseFormat?: string
  speed?: number
}

export const AudioAsrApi = {
  start: async (data: AudioAsrStartReqVO) => {
    return await request.post({ url: '/rag/ai/audio-asr/start', data })
  },
  getStatus: async (esId: string) => {
    return await request.get({ url: `/rag/ai/audio-asr/status/${esId}` })
  },
  getDetail: async (esId: string) => {
    return await request.get({ url: `/rag/ai/audio-asr/detail/${esId}` })
  },
  cancel: async (esId: string) => {
    return await request.post({ url: `/rag/ai/audio-asr/cancel/${esId}` })
  },
  summarize: async (data: AudioAsrSummaryReqVO) => {
    return await request.post({ url: '/rag/ai/audio-asr/summarize', data })
  },
  tts: async (data: AudioTtsReqVO) => {
    return await request.postOriginal({
      url: '/rag/ai/audio-asr/tts',
      data,
      responseType: 'blob'
    })
  }
}
