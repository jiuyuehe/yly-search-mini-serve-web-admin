import request from '@/config/axios'

export interface AiTaskLogVO {
  taskId: string
  taskType: string
  taskSubType?: string
  status: string
  esId?: string
  userId?: number
  userName?: string
  fileName?: string
  requestUri?: string
  modelId?: number
  engine?: string
  detail?: string
  errorMessage?: string
  startTime?: number
  endTime?: number
  durationMs?: number
  createTime?: number
  updateTime?: number
}

export interface AiTaskLogPageReqVO {
  pageNo: number
  pageSize: number
  esId?: string
  userId?: number
  taskType?: string
  status?: string
  fileName?: string
  userName?: string
  createTime?: string[]
}

export const AiTaskLogApi = {
  getPage: async (params: AiTaskLogPageReqVO) => {
    return await request.get({ url: '/rag/ai/task-log/page', params })
  },

  get: async (taskId: string) => {
    return await request.get({ url: '/rag/ai/task-log/get', params: { taskId } })
  },

  getStatistics: async (params: Partial<AiTaskLogPageReqVO>) => {
    return await request.get({ url: '/rag/ai/task-log/statistics', params })
  },

  create: async (data: Partial<AiTaskLogVO>) => {
    return await request.post({ url: '/rag/ai/task-log/create', data })
  },

  updateStatus: async (data: Partial<AiTaskLogVO>) => {
    return await request.put({ url: '/rag/ai/task-log/update-status', data })
  },

  delete: async (taskId: string) => {
    return await request.delete({ url: '/rag/ai/task-log/delete', params: { taskId } })
  },

  deleteBatch: async (taskIds: string[]) => {
    return await request.delete({ url: '/rag/ai/task-log/delete-batch', data: taskIds })
  }
}
