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
  }
}
