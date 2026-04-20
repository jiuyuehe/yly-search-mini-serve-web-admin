import request from '@/config/axios'

export const MailAnalysisApi = {
  sync: async (limit?: number) => {
    return await request.post({ url: '/rag/email-analysis/sync', params: { limit } })
  },
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/email-analysis/page', params })
  },
  getDetail: async (id: string) => {
    return await request.get({ url: '/rag/email-analysis/detail', params: { id } })
  },
  getGraph: async (params?: any) => {
    return await request.get({ url: '/rag/email-analysis/graph', params })
  },
  getEdgeMessages: async (params: any) => {
    return await request.get({ url: '/rag/email-analysis/edge-messages', params })
  }
}
