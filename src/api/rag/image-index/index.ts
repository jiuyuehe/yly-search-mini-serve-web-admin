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
  }
}
