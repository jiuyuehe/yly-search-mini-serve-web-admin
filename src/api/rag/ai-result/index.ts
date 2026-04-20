import request from '@/config/axios'

export const AiResultApi = {
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/ai/result/page', params })
  },
  getDetail: async (taskType: string, esId: string, formId?: number) => {
    return await request.get({
      url: '/rag/ai/result/detail',
      params: { taskType, esId, formId }
    })
  }
}
