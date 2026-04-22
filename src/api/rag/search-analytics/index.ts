import request from '@/config/axios'

export const SearchAnalyticsApi = {
  getOverview: async () => {
    return await request.get({ url: '/rag/search-analytics/overview' })
  },
  getTrend: async (params?: any) => {
    return await request.get({ url: '/rag/search-analytics/trend', params })
  },
  getTypeDistribution: async () => {
    return await request.get({ url: '/rag/search-analytics/type-distribution' })
  },
  getHistoryPage: async (params: any) => {
    return await request.get({ url: '/rag/search-analytics/history-page', params })
  },
  getHotKeywords: async () => {
    return await request.get({ url: '/rag/search-analytics/hot-keywords' })
  },
  getNoResultKeywords: async () => {
    return await request.get({ url: '/rag/search-analytics/no-result-keywords' })
  },
  click: async (data: any) => {
    return await request.post({ url: '/rag/search-analytics/click', data })
  }
}
