import request from '@/config/axios'

export const ImageIndexApi = {
  getStats: async () => {
    return await request.get({ url: '/rag/images/index/stats' })
  },
  getTrend: async (params?: any) => {
    return await request.get({ url: '/rag/images/index/trend', params })
  },
  getDistribution: async () => {
    return await request.get({ url: '/rag/images/index/distribution' })
  },
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/images/index/page', params })
  },
  rebuild: async (data: any) => {
    return await request.post({ url: '/rag/images/index/rebuild', data })
  },
  analyzeFace: async (params: any) => {
    return await request.post({ url: '/rag/images/index/face/analyze', params })
  },
  getFaces: async (params: any) => {
    return await request.get({ url: '/rag/images/index/face/list', params })
  },
  getLogs: async (params: any) => {
    return await request.get({ url: '/rag/ai/task-log/page', params })
  },
  searchMedia: async (data: FormData, params?: any) => {
    return await request.post({
      url: '/rag/images/search/media',
      data,
      params,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}
