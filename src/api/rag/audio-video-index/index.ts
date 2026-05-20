import request from '@/config/axios'

export const AudioVideoIndexApi = {
  getStats: async () => {
    return await request.get({ url: '/rag/media/audio-video/stats' })
  },
  getDistribution: async () => {
    return await request.get({ url: '/rag/media/audio-video/distribution' })
  },
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/media/audio-video/page', params })
  },
  getDetail: async (params: any) => {
    return await request.get({ url: '/rag/media/audio-video/detail', params })
  },
  getLogs: async (params: any) => {
    return await request.get({ url: '/rag/ai/task-log/page', params })
  }
}
