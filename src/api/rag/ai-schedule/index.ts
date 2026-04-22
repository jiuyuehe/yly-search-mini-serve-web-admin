import request from '@/config/axios'

export interface AiScheduleTaskVO {
  id?: number
  taskName: string
  taskDesc?: string
  status?: number
  sourceTypes?: string[]
  scanTaskIds?: number[]
  formatGroups?: string[]
  fileExts?: string[]
  aiTaskType: string
  modelId?: number
  rerankModelId?: number
  embeddingTarget?: string
  embeddingOverwrite?: boolean
  embeddingBatchSize?: number
  roleId?: number
  targetLang?: string
  formId?: number
  cronExpression: string
}

export const AiScheduleTaskApi = {
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/ai/schedule-task/page', params })
  },
  get: async (id: number) => {
    return await request.get({ url: `/rag/ai/schedule-task/get?id=${id}` })
  },
  create: async (data: AiScheduleTaskVO) => {
    return await request.post({ url: '/rag/ai/schedule-task/create', data })
  },
  update: async (data: AiScheduleTaskVO) => {
    return await request.put({ url: '/rag/ai/schedule-task/update', data })
  },
  delete: async (id: number) => {
    return await request.delete({ url: `/rag/ai/schedule-task/delete?id=${id}` })
  },
  updateStatus: async (data: { id: number; status: number }) => {
    return await request.put({ url: '/rag/ai/schedule-task/update-status', data })
  },
  trigger: async (id: number) => {
    return await request.post({ url: `/rag/ai/schedule-task/trigger?id=${id}` })
  }
}
