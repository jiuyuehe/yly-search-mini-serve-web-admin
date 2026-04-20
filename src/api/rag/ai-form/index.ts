import request from '@/config/axios'

export const AiFormApi = {
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/ai/form/page', params })
  }
}
