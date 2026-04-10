import request from '@/config/axios'

/**
 * OCR 任务管理 API
 */

export interface OcrStatistics {
  total: number
  completed: number
  failed: number
  cancelled: number
  runningTasks: number
  timestamp: number
}

export interface OcrHistoryItem {
  id: number
  userId: number
  esId: string
  type: string
  subType: string
  action: string
  createTime: string | number
  status?: string
  mode?: string
  totalPages?: number
  donePages?: number
  error?: string
}

export interface OcrHistoryPageResult {
  list: OcrHistoryItem[]
  total: number
}

// 获取增强统计信息
export const getEnhancedStatistics = async () => {
  return await request.get({
    url: '/rag/ai/pdf-ocr/statistics/enhanced'
  })
}

// 查询 OCR 任务历史列表
export interface OcrHistoryQueryParams {
  userId?: number | null
  esId?: string
  status?: string
  pageNo?: number
  pageSize?: number
}

export const getOcrHistory = async (params: OcrHistoryQueryParams) => {
  return await request.get({
    url: '/rag/ai/pdf-ocr/history',
    params
  })
}

// 终止 OCR 任务
export const cancelOcrTask = async (esId: string) => {
  return await request.post({
    url: `/rag/ai/pdf-ocr/cancel/${esId}`
  })
}
